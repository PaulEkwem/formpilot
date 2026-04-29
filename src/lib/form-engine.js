/**
 * FormEngine — reusable PDF field detection + filling engine
 *
 * Two-pass approach:
 *   1. analyse(pdfBytes) — pdfjs reads the PDF, extracts text labels AND
 *      drawn horizontal lines (the actual blank underlines), matches them,
 *      returns an array of Field objects with exact coordinates.
 *   2. fill(pdfBytes, fieldValues, options) — pdf-lib loads the same bytes,
 *      draws each value at the coordinates from step 1, returns filled PDF bytes.
 *
 * Requires globals: pdfjsLib (CDN), PDFLib (CDN)
 */
(function (global) {
  'use strict';

  // ── Tunables ────────────────────────────────────────────────────────────
  const HLINE_MIN_W   = 30;   // min width (pt) of a line to be treated as a field blank
  const SAME_Y_TOL    = 2.5;  // pt tolerance for "same baseline" check
  const INLINE_MAX_GAP = 15;  // max pt gap between label.xEnd and blank.x1 for inline detection
  const ABOVE_MAX     = 20;   // max pt above a line to search for its label
  const BELOW_MAX     = 18;   // max pt below a line to search for its label (label-under-blank style)
  const STACK_Y_MAX   = 22;   // max y-gap between stacked lines forming a multi-line area
  const STACK_X_TOL   = 15;   // x-range tolerance when testing if two lines stack
  const BOX_MIN       = 6;    // min box dimension (pt) to be a character box
  const BOX_MAX       = 34;   // max box dimension (pt)
  const BOX_ROW_MIN   = 3;    // min boxes in a row to register as a charbox group

  // ── Worker setup ───────────────────────────────────────────────────────
  function ensureWorker() {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  // ── Shape extraction ───────────────────────────────────────────────────
  // Walks the pdfjs operator list and pulls out:
  //   hlines — horizontal lines wide enough to be field blanks
  //   boxes  — small rectangles that could be character boxes
  async function extractShapes(page) {
    const OPS    = pdfjsLib.OPS;
    const opList = await page.getOperatorList();
    const hlines = [];
    const boxes  = [];
    let cx = 0, cy = 0;

    function tryLine(x2, y2) {
      const dx = Math.abs(x2 - cx), dy = Math.abs(y2 - cy);
      if (dy < 1.5 && dx >= HLINE_MIN_W) {
        hlines.push({ x1: Math.min(cx, x2), x2: Math.max(cx, x2), y: cy, w: dx });
      }
      cx = x2; cy = y2;
    }

    function tryRect(rx, ry, rw, rh) {
      const aw = Math.abs(rw), ah = Math.abs(rh);
      if (aw >= BOX_MIN && aw <= BOX_MAX && ah >= BOX_MIN && ah <= BOX_MAX) {
        boxes.push({ x: rx, y: ry, w: aw, h: ah });
      }
    }

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn   = opList.fnArray[i];
      const args = opList.argsArray[i];

      if      (fn === OPS.moveTo)    { cx = args[0]; cy = args[1]; }
      else if (fn === OPS.lineTo)    { tryLine(args[0], args[1]); }
      else if (fn === OPS.rectangle) { tryRect(args[0], args[1], args[2], args[3]); }
      else if (fn === OPS.constructPath) {
        // Batched path: args[0] = op-code array, args[1] = flat values array
        const subOps = args[0], vals = args[1];
        let vi = 0;
        for (const op of subOps) {
          if      (op === OPS.moveTo)    { cx = vals[vi++]; cy = vals[vi++]; }
          else if (op === OPS.lineTo)    { tryLine(vals[vi++], vals[vi++]); }
          else if (op === OPS.curveTo)   { vi += 6; }
          else if (op === OPS.curveTo2)  { vi += 4; }
          else if (op === OPS.curveTo3)  { vi += 4; }
          else if (op === OPS.closePath) { /* no args */ }
          else if (op === OPS.rectangle) {
            tryRect(vals[vi], vals[vi + 1], vals[vi + 2], vals[vi + 3]); vi += 4;
          }
        }
      }
    }

    return { hlines, boxes };
  }

  // ── Label matching ─────────────────────────────────────────────────────
  // Given a horizontal line, find the text item most likely to be its label.
  // Checks three spatial relationships (in priority order):
  //   1. Same-y, to the left, within INLINE_MAX_GAP → inline field
  //   2. Below, overlapping x → label-under-blank (e.g. "Signature", "Date")
  //   3. Above, overlapping x → heading-above-blank (e.g. "Name of Company")
  //
  // Priority: below before above so that explicitly placed under-labels (Signature,
  // Date) win over text that merely happens to sit above a blank on the same form.
  function findLabel(x1, x2, y, textItems) {
    const xOverlap = t => t.x < x2 + 10 && t.xEnd > x1 - 10;

    // 1. Inline: same y, ends at or before x1, not too far left
    const inline = textItems.filter(t =>
      Math.abs(t.y - y) <= SAME_Y_TOL && t.xEnd <= x1 + 10 &&
      (x1 - t.xEnd) <= INLINE_MAX_GAP
    );
    if (inline.length)
      return inline.reduce((a, b) => b.xEnd > a.xEnd ? b : a);

    // 2. Below: label sits under the blank line (e.g. "Signature", "Date")
    const below = textItems.filter(t =>
      t.y < y && y - t.y <= BELOW_MAX && xOverlap(t)
    );
    if (below.length)
      return below.reduce((a, b) => b.y > a.y ? b : a); // highest = closest

    // 3. Above: heading sits above the blank (e.g. "Name of Company")
    const above = textItems.filter(t =>
      t.y > y && t.y - y <= ABOVE_MAX && xOverlap(t)
    );
    if (above.length)
      return above.reduce((a, b) => a.y < b.y ? a : b); // lowest = closest

    return null;
  }

  // ── Line grouping ───────────────────────────────────────────────────────
  // Groups horizontally-aligned stacked lines into multi-line text areas.
  function groupLines(hlines) {
    const sorted = [...hlines].sort((a, b) => b.y - a.y); // top → bottom
    const groups = [];
    const used   = new Set();

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const base  = sorted[i];
      const group = [base];
      used.add(i);

      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const other = sorted[j];
        const yGap  = base.y - other.y;
        const xOk   =
          Math.abs(other.x1 - base.x1) <= STACK_X_TOL &&
          Math.abs(other.x2 - base.x2) <= STACK_X_TOL;
        if (xOk && yGap > 0.5 && yGap <= STACK_Y_MAX) {
          group.push(other);
          used.add(j);
        }
      }

      groups.push(group.sort((a, b) => b.y - a.y)); // topmost line first
    }

    return groups;
  }

  // ── Charbox grouping ────────────────────────────────────────────────────
  // Groups small same-y rectangles into rows (account-number boxes, date boxes, etc.).
  function groupCharBoxes(boxes) {
    const sorted = [...boxes].sort((a, b) => b.y - a.y || a.x - b.x);
    const groups = [];
    const used   = new Set();

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const base = sorted[i];
      const row  = [base];
      used.add(i);

      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const o = sorted[j];
        if (Math.abs(o.y - base.y) < 4 &&
            Math.abs(o.h - base.h) < 4 &&
            Math.abs(o.w - base.w) < 6) {
          row.push(o);
          used.add(j);
        }
      }

      if (row.length >= BOX_ROW_MIN)
        groups.push(row.sort((a, b) => a.x - b.x));
    }

    return groups;
  }

  // ── Analyse ─────────────────────────────────────────────────────────────
  // Reads a PDF with pdfjs and returns an array of Field objects.
  // Field:
  //   label    — matched label text (or null)
  //   type     — 'single' | 'multiline' | 'charboxes'
  //   fillX    — x to start drawing the value
  //   fillY    — y (baseline) to draw the value
  //   lineX1/X2 — extent of the blank underline
  //   lineW    — width of the blank area (useful for text wrapping)
  //   lineYs   — (multiline only) y of each stacked line, top-first
  //   boxes    — (charboxes only) array of {x,y,w,h}
  async function analyse(pdfBytes) {
    ensureWorker();

    const pdf  = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
    const page = await pdf.getPage(1);

    // --- Text items ---
    const tc    = await page.getTextContent();
    const items = tc.items
      .filter(t => t.str && t.str.trim())
      .map(t => ({
        text:  t.str.trim(),
        x:     t.transform[4],
        y:     t.transform[5],
        xEnd:  t.transform[4] + (t.width || 0),
        fontSize: Math.abs(t.transform[0])
      }));

    // --- Shapes ---
    const { hlines, boxes } = await extractShapes(page);

    const fields = [];

    // Process grouped lines → single or multiline fields
    for (const group of groupLines(hlines)) {
      const top     = group[0];
      const label   = findLabel(top.x1, top.x2, top.y, items);
      const inline  = label && Math.abs(label.y - top.y) <= SAME_Y_TOL;

      fields.push({
        label:   label ? label.text : null,
        type:    group.length > 1 ? 'multiline' : 'single',
        fillX:   inline ? label.xEnd + 3 : top.x1,
        fillY:   top.y,
        lineX1:  top.x1,
        lineX2:  top.x2,
        lineW:   top.x2 - top.x1,
        lineYs:  group.map(l => l.y)   // for multiline
      });
    }

    // Process charbox rows
    for (const row of groupCharBoxes(boxes)) {
      const midY  = row[0].y + row[0].h / 2;
      const lastX = row[row.length - 1].x + row[row.length - 1].w;
      const label = findLabel(row[0].x, lastX, midY, items);

      fields.push({
        label:  label ? label.text : null,
        type:   'charboxes',
        fillX:  row[0].x,
        fillY:  row[0].y,
        lineX1: row[0].x,
        lineX2: lastX,
        lineW:  lastX - row[0].x,
        lineYs: [row[0].y],
        boxes:  row
      });
    }

    return fields;
  }

  // ── Field lookup ────────────────────────────────────────────────────────
  // Finds a field by label using: exact → label-contains-key → key-contains-label
  function findField(fields, key) {
    if (!key) return null;
    const k = key.trim().toLowerCase();
    return (
      fields.find(f => f.label && f.label.toLowerCase() === k) ||
      fields.find(f => f.label && f.label.toLowerCase().includes(k)) ||
      fields.find(f => f.label && k.includes(f.label.toLowerCase())) ||
      null
    );
  }

  // ── Text wrapping helper ────────────────────────────────────────────────
  function wrapText(text, lineWidthPt, fontSize) {
    const avgCW  = (fontSize || 10) * 0.56;
    const cols   = Math.max(10, Math.floor(lineWidthPt / avgCW));
    const words  = text.split(' ');
    const lines  = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? cur + ' ' + w : w;
      if (candidate.length > cols) { if (cur) lines.push(cur); cur = w; }
      else cur = candidate;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ── Fill ────────────────────────────────────────────────────────────────
  // Loads the PDF with pdf-lib, draws each value at the coordinates returned
  // by analyse(), and returns the filled PDF bytes.
  //
  // fieldValues: plain object  { labelKey: value, ... }
  //   Special keys:
  //     '_signature' — dataUrl of the referee's signature image
  //
  // options:
  //   pageIndex     — 0-based page to fill (default 0)
  //   fontSize      — default font size for single-line fields (default 10)
  //   sigMaxH       — max signature image height in pt (default 28)
  //   signatureLabel — label key to identify the signature line (default 'signature')
  //   debug         — if true, log detected fields to the console
  async function fill(pdfBytes, fieldValues, options = {}) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const BLACK = rgb(0, 0, 0);
    const fs    = options.fontSize || 10;

    // Step 1 — analyse
    const fields = await analyse(pdfBytes);

    if (options.debug) {
      console.group('FormEngine detected fields');
      fields.forEach(f => console.log(f.type, '|', f.label, '| fillX:', f.fillX, 'fillY:', f.fillY));
      console.groupEnd();
    }

    // Step 2 — load with pdf-lib
    const doc   = await PDFDocument.load(pdfBytes);
    const font  = await doc.embedFont(StandardFonts.Helvetica);
    const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
    const pg    = doc.getPages()[options.pageIndex || 0];

    function drawText(text, x, y, size, bold) {
      if (!text) return;
      pg.drawText(String(text), {
        x, y,
        size: size || fs,
        font: bold ? fontB : font,
        color: BLACK
      });
    }

    // Step 3 — draw each field value
    for (const [key, value] of Object.entries(fieldValues)) {
      if (key === '_signature' || !value) continue;
      const field = findField(fields, key);
      if (!field) { console.warn('FormEngine: no field matched for key:', key); continue; }
      const val = String(value);

      if (field.type === 'charboxes') {
        field.boxes.forEach((box, i) => {
          if (val[i] && val[i].trim()) {
            const boxFs = Math.round(box.h * 0.65 * 10) / 10;
            drawText(val[i], box.x + box.w * 0.22, box.y + box.h * 0.15, boxFs);
          }
        });

      } else if (field.type === 'multiline') {
        const wrapped = wrapText(val, field.lineW, fs);
        field.lineYs.forEach((lineY, i) => {
          if (wrapped[i]) drawText(wrapped[i], field.lineX1, lineY, fs);
        });

      } else {
        // single line
        drawText(val, field.fillX, field.fillY, fs);
      }
    }

    // Step 4 — embed signature image
    const sigDataUrl = options.signature || fieldValues['_signature'];
    if (sigDataUrl) {
      const sigLabel = options.signatureLabel || 'signature';
      const sigField = findField(fields, sigLabel);
      if (sigField) {
        try {
          const b64     = sigDataUrl.split(',')[1];
          const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const img = sigDataUrl.startsWith('data:image/png')
            ? await doc.embedPng(sigBytes)
            : await doc.embedJpg(sigBytes);
          const { width: iw, height: ih } = img.size();
          const aspect = iw / ih;
          const maxH   = options.sigMaxH || 28;
          const maxW   = options.sigMaxW || sigField.lineW || 150;
          const h      = Math.min(maxH, maxW / aspect);
          const w      = h * aspect;
          pg.drawImage(img, { x: sigField.fillX, y: sigField.fillY, width: w, height: h });
        } catch (e) {
          console.warn('FormEngine: signature embed error', e);
        }
      } else {
        console.warn('FormEngine: no field matched for signature label:', sigLabel);
      }
    }

    return doc.save();
  }

  // ── Public API ─────────────────────────────────────────────────────────
  global.FormEngine = { analyse, fill };

})(window);
