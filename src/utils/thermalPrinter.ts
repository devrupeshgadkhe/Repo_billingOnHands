/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-Reliability Thermal Printing Engine for 58mm & 80mm POS Printers
 * Completely isolates the thermal slip from host page styles, dark backdrops,
 * modal dialog borders, shadows, and flex/overflow clipping.
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

    // Strip preview-only classes and attributes that cause black borders on thermal heads
    clone.style.boxShadow = "none";
    clone.style.webkitBoxShadow = "none";
    clone.style.border = "none";
    clone.style.outline = "none";
    clone.style.margin = "0 auto";
    clone.style.padding = paperWidth === "58mm" ? "1mm 1.5mm" : "2mm 2.5mm";
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#000000";

    // Clean up preview-only decorative elements (e.g. simulated paper roll top border)
    clone.querySelectorAll('.no-print, .print\\:hidden').forEach(node => node.remove());

    // Remove any gray borders or shadows inside the cloned tree
    const allDescendants = clone.querySelectorAll<HTMLElement>('*');
    allDescendants.forEach(node => {
      node.style.boxShadow = "none";
      node.style.webkitBoxShadow = "none";
      node.style.textShadow = "none";
      
      // If element has a background that isn't white, make it transparent/white
      const bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
        node.style.backgroundColor = "#ffffff";
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
    const bodyContentWidth = paperWidth === "58mm" ? "50mm" : "72mm";
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
            background-color: transparent !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
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
          }
          .thermal-print-wrapper {
            width: ${bodyContentWidth} !important;
            max-width: ${bodyContentWidth} !important;
            margin: 0 auto !important;
            padding: 1.5mm 1mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
            filter: grayscale(100%) contrast(200%) !important;
          }
          /* Ensure dashed borders are crisp 1px lines without fuzzy gray smudges */
          .border-dashed {
            border-style: dashed !important;
            border-color: #000000 !important;
          }
          .border-black {
            border-color: #000000 !important;
          }
          .border-t, .border-b, .border-y, .border {
            border-color: #000000 !important;
          }
          .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500 {
            color: #000000 !important;
          }
          .bg-white, .bg-slate-50, .bg-slate-100, .bg-slate-200 {
            background-color: #ffffff !important;
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
