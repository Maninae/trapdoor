/*
 * Chapter 7 label placement (Trapdoor.Curves.placeLabels) for the smooth-curve plots.
 *
 * - Tries a ring of slots around each anchor; earlier labels win their first choice.
 * - Prefers a slot clear of every stroke and dot, then one clear of the curve, then any slot
 *   inside the plot that misses the other labels. A label with no slot at all is skipped.
 * - Load after curves-helpers.js; it reads SAMPLES, toScreen, and PLOT_SIZE from there.
 */
(function () {
  "use strict";

  const Curves = window.Trapdoor.Curves;
  const { SAMPLES, PLOT_SIZE, toScreen, createSvgElement } = Curves;
  const LABEL_CHAR_WIDTH = 10;
  const LABEL_HEIGHT = 20;
  const LABEL_STROKE_MARGIN = 3;

  function boxesOverlap(a, b) {
    return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
  }

  /** Liang-Barsky: does the segment cross the box grown by the stroke margin? */
  function segmentHitsBox(x1, y1, x2, y2, box) {
    const m = LABEL_STROKE_MARGIN;
    const xMin = box.left - m; const xMax = box.left + box.width + m;
    const yMin = box.top - m; const yMax = box.top + box.height + m;
    const dx = x2 - x1; const dy = y2 - y1;
    let enter = 0; let leave = 1;
    const tests = [[-dx, x1 - xMin], [dx, xMax - x1], [-dy, y1 - yMin], [dy, yMax - y1]];
    for (const [p, q] of tests) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) enter = Math.max(enter, t); else leave = Math.min(leave, t);
      if (enter > leave) return false;
    }
    return true;
  }

  function boxHitsStrokes(box, segments) {
    return segments.some(([x1, y1, x2, y2]) => segmentHitsBox(x1, y1, x2, y2, box));
  }

  function boxHitsDots(box, dots) {
    return dots.some(({ x, y, r }) => x + r > box.left && x - r < box.left + box.width
      && y + r > box.top && y - r < box.top + box.height);
  }

  /** The curve as screen segments, plus every straight line already drawn in the plot. */
  function collectStrokeSegments(group) {
    const curve = [];
    for (let index = 1; index < SAMPLES.length; index += 1) {
      curve.push([...toScreen(SAMPLES[index - 1]), ...toScreen(SAMPLES[index])]);
    }
    const svg = group.ownerSVGElement || group;
    const lines = Array.from(svg.querySelectorAll("line")).map((line) => ["x1", "y1", "x2", "y2"]
      .map((name) => Number(line.getAttribute(name))));
    return { curve, all: curve.concat(lines) };
  }

  /**
   * Place text labels next to their anchors without overlapping each other or the edge,
   * preferring slots that keep clear of the curve, the drawn lines, and the dots.
   * labels: [{ anchor: [x, y], text, className }]; earlier labels win their first choice.
   */
  function placeLabels(group, labels) {
    const offsets = [[14, -14], [14, 26], [-14, -14], [-14, 26], [16, 6], [-16, 6],
      [22, -24], [22, 36], [-22, -24], [-22, 36], [0, -22], [0, 34]];
    const placedBoxes = [];
    const strokes = collectStrokeSegments(group);
    const dots = Array.from(group.querySelectorAll("circle:not(.curve-handle-hit):not(.curve-handle-ring)")).map((circle) => ({
      x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")), r: Number(circle.getAttribute("r")),
    }));
    labels.forEach(({ anchor, text, className }) => {
      const width = text.length * LABEL_CHAR_WIDTH;
      const candidates = [];
      for (const [offsetX, offsetY] of offsets) {
        const left = offsetX > 0 ? anchor[0] + offsetX
          : offsetX < 0 ? anchor[0] + offsetX - width : anchor[0] - width / 2;
        const box = { left, top: anchor[1] + offsetY - LABEL_HEIGHT + 4, width, height: LABEL_HEIGHT };
        const insidePlot = box.left >= 2 && box.left + width <= PLOT_SIZE - 2 && box.top >= 2
          && box.top + LABEL_HEIGHT <= PLOT_SIZE - 2;
        const overlaps = placedBoxes.some((other) => boxesOverlap(box, other));
        if (insidePlot && !overlaps) candidates.push(box);
      }
      // Prefer a slot clear of every stroke and dot; else clear of the curve; else the first that fits.
      const clearOfAll = candidates.find((box) => !boxHitsStrokes(box, strokes.all) && !boxHitsDots(box, dots));
      const clearOfCurve = candidates.find((box) => !boxHitsStrokes(box, strokes.curve) && !boxHitsDots(box, dots));
      const chosen = clearOfAll || clearOfCurve || candidates[0];
      if (!chosen) return;
      placedBoxes.push(chosen);
      const label = createSvgElement("text", { x: chosen.left, y: chosen.top + LABEL_HEIGHT - 4, class: className });
      label.textContent = text;
      group.appendChild(label);
    });
  }

  Curves.placeLabels = placeLabels;
})();
