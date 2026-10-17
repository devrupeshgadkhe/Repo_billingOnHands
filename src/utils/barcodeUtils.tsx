/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Item, BarcodeEntry } from "../types";

// Standard Code 128 Character Patterns (Modules 0 to 106)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106
];

/**
 * Encodes string to Code 128-B bar sequence
 */
export function encodeCode128(text: string): string {
  if (!text || text.length === 0) return "";
  
  // Clean ASCII within range 32 to 126
  const clean = text.replace(/[^\x20-\x7E]/g, "");
  if (!clean) return "";

  const START_B = 104;
  const STOP = 106;

  let checksum = START_B;
  const codes: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(STOP);

  let binaryPattern = "";
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    
    // Pattern describes alternating widths of bars and spaces
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      const isBar = j % 2 === 0;
      binaryPattern += (isBar ? "1" : "0").repeat(width);
    }
  }

  return binaryPattern;
}

export interface BarcodeSvgProps {
  value: string;
  width?: number | string;
  height?: number;
  barColor?: string;
  bgColor?: string;
  showText?: boolean;
  fontSize?: number;
  className?: string;
}

/**
 * Universal SVG Code-128 Barcode Renderer
 */
export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  width = "100%",
  height = 50,
  barColor = "#000000",
  bgColor = "#ffffff",
  showText = true,
  fontSize = 11,
  className = ""
}) => {
  const binary = encodeCode128(value || "");
  if (!binary) {
    return (
      <div className={`flex items-center justify-center p-2 text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded ${className}`}>
        Invalid Barcode
      </div>
    );
  }

  const quietZone = 10;
  const totalWidth = binary.length + quietZone * 2;
  const barHeight = showText ? Math.max(20, height - fontSize - 6) : height;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ backgroundColor: bgColor }}
        className="w-full h-auto max-w-full"
      >
        <rect x="0" y="0" width={totalWidth} height={height} fill={bgColor} />
        {Array.from(binary).map((bit, idx) => {
          if (bit === "1") {
            return (
              <rect
                key={idx}
                x={quietZone + idx}
                y={2}
                width={1}
                height={barHeight}
                fill={barColor}
              />
            );
          }
          return null;
        })}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fill={barColor}
            fontSize={fontSize}
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1px"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
};

/**
 * Auto-generate a unique custom barcode with prefix
 */
export function generateCustomBarcode(prefix: string = "BOH", existingItems?: Item[]): string {
  const cleanPrefix = (prefix || "BOH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "BOH";
  const existingSet = new Set<string>();
  if (existingItems) {
    for (const it of existingItems) {
      if (Array.isArray(it.barcodes)) {
        it.barcodes.forEach(b => existingSet.add((b || "").trim().toUpperCase()));
      }
    }
  }

  // Generate unique 6-digit serial
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomSerial = Math.floor(100000 + Math.random() * 900000);
    const candidate = `${cleanPrefix}-${randomSerial}`;
    if (!existingSet.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  // Fallback with timestamp
  return `${cleanPrefix}-${Date.now().toString().slice(-6)}`;
}

/**
 * Check if a barcode is already assigned to another item
 */
export function checkDuplicateBarcode(
  barcode: string,
  items: Item[],
  currentItemId?: string
): { isDuplicate: boolean; matchedItem?: Item } {
  if (!barcode || !barcode.trim()) {
    return { isDuplicate: false };
  }
  const clean = barcode.trim().toUpperCase();
  const matched = items.find(it => {
    if (currentItemId && it.id === currentItemId) return false;
    return Array.isArray(it.barcodes) && it.barcodes.some(b => (b || "").trim().toUpperCase() === clean);
  });

  return {
    isDuplicate: Boolean(matched),
    matchedItem: matched
  };
}

/**
 * Clean & normalize barcode list
 */
export function normalizeBarcodes(barcodes?: string[]): string[] {
  if (!Array.isArray(barcodes)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const b of barcodes) {
    const clean = (b || "").trim();
    if (clean && !seen.has(clean.toUpperCase())) {
      seen.add(clean.toUpperCase());
      result.push(clean);
    }
  }
  return result;
}

/**
 * Match an item by any of its barcodes or barcode entries
 */
export function matchItemByBarcode(barcode: string, items: Item[]): Item | undefined {
  if (!barcode || !barcode.trim()) return undefined;
  const q = barcode.trim().toLowerCase();
  return (items || []).find(it => {
    if (Array.isArray(it.barcodes) && it.barcodes.some(b => (b || "").trim().toLowerCase() === q)) {
      return true;
    }
    if (Array.isArray(it.barcodeEntries) && it.barcodeEntries.some(e => (e.code || "").trim().toLowerCase() === q)) {
      return true;
    }
    return false;
  });
}

/**
 * Get all unique barcodes associated with an item
 */
export function getItemAllBarcodes(item: Item): string[] {
  const set = new Set<string>();
  if (Array.isArray(item.barcodes)) {
    item.barcodes.forEach(b => {
      if (b && b.trim()) set.add(b.trim());
    });
  }
  if (Array.isArray(item.barcodeEntries)) {
    item.barcodeEntries.forEach(e => {
      if (e.code && e.code.trim()) set.add(e.code.trim());
    });
  }
  return Array.from(set);
}

