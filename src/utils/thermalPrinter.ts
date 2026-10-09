/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-Reliability Thermal Printing Engine for 58mm & 80mm POS Printers
 * Completely eliminates black borders, background smudges, and solid-black test pages.
 * Ensures 100% white background (#FFFFFF) with crisp black (#000000) thermal typography.
 */

export function printThermalElement(
  elementOrId: HTMLElement | string,
  paperWidth: "58mm" | "80mm" = "80mm"
): boolean {
  try {
    const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
    if (!el) {
      console.warn("[ThermalPrinter] Target element not found, falling back to window.print()");
      window.print();
      return false;
    }

    // Clone element to prevent altering the live UI
    const clone = el.cloneNode(true) as HTMLElement;

    // Strip preview-only classes that cause black borders on thermal heads
    clone.style.boxShadow = "none";
    clone.style.webkitBoxShadow = "none";
    clone.style.border = "none";
    clone.style.outline = "none";
    clone.style.margin = "0 auto";
    clone.style.padding = "0";
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#000000";

    // Clean up preview-only decorative elements (e.g. simulated paper roll top border)
    clone.querySelectorAll('.no-print, .print\\:hidden, [data-no-print]').forEach(node => node.remove());

    // Clean up all descendants: ensure pure white backgrounds and crisp black text
    const allDescendants = clone.querySelectorAll<HTMLElement>('*');
    allDescendants.forEach(node => {
      node.style.boxShadow = "none";
      node.style.webkitBoxShadow = "none";
      node.style.textShadow = "none";
      node.style.outline = "none";
      node.style.backgroundColor = "#ffffff";
      node.style.color = "#000000";

      // Remove 4-sided outer perimeter borders on preview containers
      if (node.classList.contains('border') && !node.classList.contains('border-t') && !node.classList.contains('border-b') && !node.classList.contains('border-y')) {
        node.style.border = "none";
      }
    });

    // Create an invisible, isolated iframe directly on body
    const iframe = document.createElement("iframe");
    iframe.id = "thermal-isolated-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return false;
    }

    const cssPageWidth = paperWidth === "58mm" ? "58mm" : "80mm";
    const bodyContentWidth = paperWidth === "58mm" ? "52mm" : "74mm";
    const baseFontSize = paperWidth === "58mm" ? "9.5px" : "11px";

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Thermal Bill</title>
        <style>
          @page {
            size: ${cssPageWidth} auto;
            margin: 0 !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            text-shadow: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, monospace !important;
            font-size: ${baseFontSize} !important;
            line-height: 1.3 !important;
            width: ${cssPageWidth} !important;
            max-width: ${cssPageWidth} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            outline: none !important;
          }
          .thermal-print-wrapper {
            width: ${bodyContentWidth} !important;
            max-width: ${bodyContentWidth} !important;
            margin: 0 auto !important;
            padding: 2mm 1.5mm !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            border-width: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
          }
          /* Standard Layout Helpers for Receipts */
          .flex {
            display: flex !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .justify-center {
            justify-content: center !important;
          }
          .items-center {
            align-items: center !important;
          }
          .flex-col {
            flex-direction: column !important;
          }
          .flex-wrap {
            flex-wrap: wrap !important;
          }
          .text-center {
            text-align: center !important;
          }
          .text-right {
            text-align: right !important;
          }
          .text-left {
            text-align: left !important;
          }
          .font-bold, strong, b {
            font-weight: 700 !important;
          }
          .font-black {
            font-weight: 900 !important;
          }
          .font-mono {
            font-family: 'Courier New', Courier, monospace !important;
          }
          .uppercase {
            text-transform: uppercase !important;
          }
          .italic {
            font-style: italic !important;
          }
          .leading-tight {
            line-height: 1.25 !important;
          }
          .whitespace-pre-line {
            white-space: pre-line !important;
          }
          /* Spacings */
          .space-y-0\\.5 > * + * {
            margin-top: 2px !important;
          }
          .space-y-1 > * + * {
            margin-top: 4px !important;
          }
          .space-y-1\\.5 > * + * {
            margin-top: 6px !important;
          }
          .mb-0\\.5 { margin-bottom: 2px !important; }
          .mb-1 { margin-bottom: 4px !important; }
          .mb-1\\.5 { margin-bottom: 6px !important; }
          .mb-2 { margin-bottom: 8px !important; }
          .my-1 { margin-top: 4px !important; margin-bottom: 4px !important; }
          .my-1\\.5 { margin-top: 6px !important; margin-bottom: 6px !important; }
          .my-2 { margin-top: 8px !important; margin-bottom: 8px !important; }
          .my-2\\.5 { margin-top: 10px !important; margin-bottom: 10px !important; }
          .my-3 { margin-top: 12px !important; margin-bottom: 12px !important; }
          .mt-0\\.5 { margin-top: 2px !important; }
          .mt-1 { margin-top: 4px !important; }
          .p-1 { padding: 4px !important; }
          .p-1\\.5 { padding: 6px !important; }
          .p-2 { padding: 8px !important; }
          .pt-0\\.5 { padding-top: 2px !important; }
          .pt-1 { padding-top: 4px !important; }
          .pb-0\\.5 { padding-bottom: 2px !important; }
          .pl-2 { padding-left: 8px !important; }
          .gap-1 { gap: 4px !important; }
          .w-20 { width: 80px !important; }
          .h-20 { height: 80px !important; }
          .w-24 { width: 96px !important; }
          .h-24 { height: 96px !important; }
          .max-h-12 { max-height: 48px !important; }
          img {
            max-width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            filter: contrast(180%) !important;
          }
          /* Crisp dashed and solid section dividers without black borders */
          .border-t {
            border-top: 1px dashed #000000 !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
          }
          .border-b {
            border-bottom: 1px dashed #000000 !important;
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
          }
          .border-y {
            border-top: 1px solid #000000 !important;
            border-bottom: 1px solid #000000 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .border-y-2 {
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .border-dashed {
            border-style: dashed !important;
          }
          .border-black, .border-slate-300, .border-slate-400 {
            border-color: #000000 !important;
          }
          /* Strip surrounding perimeter borders */
          #thermal-receipt-preview,
          #thermal-receipt-invoice-content,
          .thermal-sheet-wrapper {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="thermal-print-wrapper">
          ${clone.innerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Small delay to allow images and fonts to parse before sending to print spooler
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("[ThermalPrinter] Iframe print exception, fallback to window.print():", err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      }
    }, 280);

    return true;
  } catch (err) {
    console.error("[ThermalPrinter] Fatal error preparing thermal print:", err);
    window.print();
    return false;
  }
}
