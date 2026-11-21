/*
 * Chapter 7 helpers (Trapdoor.Curves): the curve y^2 = x^3 - x + 1, drawn two ways.
 *
 * - Smooth curve: float math, a fixed 400x400 plot window, a dense ordered list of points
 *   on the curve (so dragging snaps to it), and the "add" construction drawing.
 * - The whole-number grid half lives in curves-grid-helpers.js (load it after this file).
 * - The point "zero" (what a vertical line gives) is represented as null everywhere.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const CURVE_A = -1;
  const CURVE_B = 1;
  const PLOT_SIZE = 400;
  const VIEW = { xMin: -1.9, xMax: 3.3, yMin: -5.6, yMax: 5.6 };
  const SAMPLES_PER_BRANCH = 700;
  const LONG_LINE_PX = 3000;
  const SAME_POINT_TOLERANCE = 1e-9;
  const LABEL_CHAR_WIDTH = 10;
  const LABEL_HEIGHT = 20;

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  function curveRightSide(x) {
    return x * x * x + CURVE_A * x + CURVE_B;
  }

  /** The one real root of x^3 - x + 1 (about -1.3247), where the curve turns around. */
  function findRootX() {
    let low = -2;
    let high = 0;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const middle = (low + high) / 2;
      if (curveRightSide(middle) < 0) low = middle; else high = middle;
    }
    return (low + high) / 2;
  }

  const ROOT_X = findRootX();

  function toScreen(point) {
    return [
      ((point.x - VIEW.xMin) / (VIEW.xMax - VIEW.xMin)) * PLOT_SIZE,
      ((VIEW.yMax - point.y) / (VIEW.yMax - VIEW.yMin)) * PLOT_SIZE,
    ];
  }

  function isOnPage(point) {
    return point.x >= VIEW.xMin && point.x <= VIEW.xMax && point.y >= VIEW.yMin && point.y <= VIEW.yMax;
  }

  /**
   * Points along the curve in order: top-right end, down the upper branch, round the turn
   * at the root, out along the lower branch. Squared spacing packs samples near the turn.
   */
  function buildSamples() {
    const upper = [];
    for (let index = SAMPLES_PER_BRANCH; index >= 0; index -= 1) {
      const fraction = index / SAMPLES_PER_BRANCH;
      const x = ROOT_X + (VIEW.xMax + 0.3 - ROOT_X) * fraction * fraction;
      upper.push({ x, y: Math.sqrt(Math.max(0, curveRightSide(x))) });
    }
    const lower = upper.slice(0, -1).reverse().map((point) => ({ x: point.x, y: -point.y }));
    return upper.concat(lower);
  }

  const SAMPLES = buildSamples();

  /** Index of the curve sample closest to a point given in plot (SVG) coordinates. */
  function nearestSampleIndex(plotX, plotY) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    SAMPLES.forEach((sample, index) => {
      const [sampleX, sampleY] = toScreen(sample);
      const distance = (sampleX - plotX) ** 2 + (sampleY - plotY) ** 2;
      if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
    });
    return bestIndex;
  }

  /**
   * P + Q on the smooth curve.
   * Returns null for "zero" (vertical line), else { sum, third, slope } where third is the
   * line's third crossing and sum is third flipped over the x-axis.
   */
  function addRealPoints(pointP, pointQ) {
    if (pointP === null) return pointQ && { sum: pointQ, third: null, slope: null };
    if (pointQ === null) return { sum: pointP, third: null, slope: null };
    const sameX = Math.abs(pointP.x - pointQ.x) < SAME_POINT_TOLERANCE;
    const samePoint = sameX && Math.abs(pointP.y - pointQ.y) < SAME_POINT_TOLERANCE;
    if (sameX && !samePoint) return null;
    if (samePoint && Math.abs(pointP.y) < SAME_POINT_TOLERANCE) return null;
    const slope = samePoint
      ? (3 * pointP.x * pointP.x + CURVE_A) / (2 * pointP.y)
      : (pointQ.y - pointP.y) / (pointQ.x - pointP.x);
    const thirdX = slope * slope - pointP.x - pointQ.x;
    const thirdY = pointP.y + slope * (thirdX - pointP.x);
    return { sum: { x: thirdX, y: -thirdY }, third: { x: thirdX, y: thirdY }, slope };
  }

  /** Two decimals with a true minus sign; "-0.00" shows as "0.00". */
  function formatReal(value) {
    const rounded = Math.round(value * 100) / 100;
    const text = Math.abs(rounded).toFixed(2);
    return rounded < 0 ? `−${text}` : text;
  }

  function formatRealPoint(point) {
    return point === null ? "zero" : `(${formatReal(point.x)}, ${formatReal(point.y)})`;
  }

  /** Axes plus the curve itself; returns a fresh group for everything drawn on top. */
  function drawCurveBase(svg) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${PLOT_SIZE} ${PLOT_SIZE}`);
    const [originX, originY] = toScreen({ x: 0, y: 0 });
    svg.appendChild(createSvgElement("line", { x1: 0, y1: originY, x2: PLOT_SIZE, y2: originY, class: "curve-axis" }));
    svg.appendChild(createSvgElement("line", { x1: originX, y1: 0, x2: originX, y2: PLOT_SIZE, class: "curve-axis" }));
    const pathData = SAMPLES.map((sample, index) => {
      const [x, y] = toScreen(sample);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    svg.appendChild(createSvgElement("path", { d: pathData, class: "curve-path" }));
    const overlay = createSvgElement("g", {});
    svg.appendChild(overlay);
    return overlay;
  }

  /** A line through `point` with `slope` (null slope = vertical), long enough to cross the plot. */
  function drawLineThrough(group, point, slope) {
    const [x, y] = toScreen(point);
    let directionX = 0;
    let directionY = 1;
    if (slope !== null) {
      const scaleX = PLOT_SIZE / (VIEW.xMax - VIEW.xMin);
      const scaleY = PLOT_SIZE / (VIEW.yMax - VIEW.yMin);
      const length = Math.hypot(scaleX, slope * scaleY);
      directionX = scaleX / length;
      directionY = (-slope * scaleY) / length;
    }
    group.appendChild(createSvgElement("line", {
      x1: x - directionX * LONG_LINE_PX, y1: y - directionY * LONG_LINE_PX,
      x2: x + directionX * LONG_LINE_PX, y2: y + directionY * LONG_LINE_PX,
      class: "curve-line",
    }));
  }

  /**
   * The add construction for one result: line, third crossing, dashed flip, and the sum dot.
   * `throughPoint` is any point on the line (P). Returns the sum's screen position or null.
   */
  function drawConstruction(group, throughPoint, otherPoint, result) {
    if (result === null) {
      drawLineThrough(group, throughPoint, null);
      return null;
    }
    drawLineThrough(group, throughPoint, result.slope);
    const [thirdX, thirdY] = toScreen(result.third);
    const [sumX, sumY] = toScreen(result.sum);
    group.appendChild(createSvgElement("line", { x1: thirdX, y1: thirdY, x2: sumX, y2: sumY, class: "curve-flip" }));
    group.appendChild(createSvgElement("circle", { cx: thirdX, cy: thirdY, r: 7, class: "curve-third" }));
    group.appendChild(createSvgElement("circle", { cx: sumX, cy: sumY, r: 10, class: "curve-sum" }));
    return isOnPage(result.sum) ? [sumX, sumY] : null;
  }

  /**
   * Place text labels next to their anchors without overlapping each other or the edge.
   * labels: [{ anchor: [x, y], text, className }]; earlier labels win their first choice.
   */
  function placeLabels(group, labels) {
    const offsets = [[14, -14], [14, 26], [-14, -14], [-14, 26], [16, 6], [-16, 6]];
    const placedBoxes = [];
    labels.forEach(({ anchor, text, className }) => {
      const width = text.length * LABEL_CHAR_WIDTH;
      let chosen = null;
      for (const [offsetX, offsetY] of offsets) {
        const left = offsetX >= 0 ? anchor[0] + offsetX : anchor[0] + offsetX - width;
        const box = { left, top: anchor[1] + offsetY - LABEL_HEIGHT + 4, width, height: LABEL_HEIGHT };
        const insidePlot = box.left >= 2 && box.left + width <= PLOT_SIZE - 2 && box.top >= 2
          && box.top + LABEL_HEIGHT <= PLOT_SIZE - 2;
        const overlaps = placedBoxes.some((other) => box.left < other.left + other.width
          && other.left < box.left + box.width && box.top < other.top + other.height
          && other.top < box.top + box.height);
        if (insidePlot && !overlaps) { chosen = box; break; }
      }
      if (!chosen) return;
      placedBoxes.push(chosen);
      const label = createSvgElement("text", { x: chosen.left, y: chosen.top + LABEL_HEIGHT - 4, class: className });
      label.textContent = text;
      group.appendChild(label);
    });
  }

  /** Convert a pointer event's screen position into plot coordinates. */
  function clientToPlot(svg, clientX, clientY) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return [0, 0];
    const inverse = matrix.inverse();
    return [inverse.a * clientX + inverse.c * clientY + inverse.e, inverse.b * clientX + inverse.d * clientY + inverse.f];
  }

  /**
   * Make draggable handles on a curve plot. Handles are re-created on every render, so the
   * plot listens once and asks `options.handleAt(target)` which handle a pointer grabbed.
   *
   * options.onDrag(handleName, sampleIndex): called on each move with the snapped sample.
   * options.onTapCurve(sampleIndex): a tap off any handle (moves the nearest handle).
   * - Handles carry touch-action: none, so a finger on a handle drags instead of scrolling,
   *   while a finger elsewhere on the plot still scrolls the page.
   */
  function attachCurveDragging(svg, options) {
    let activeHandle = null;
    let draggedSinceDown = false;
    svg.addEventListener("pointerdown", (event) => {
      draggedSinceDown = false;
      const handleGroup = event.target.closest("[data-handle]");
      if (!handleGroup) return;
      event.preventDefault();
      activeHandle = handleGroup.dataset.handle;
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", (event) => {
      if (!activeHandle) return;
      draggedSinceDown = true;
      const [plotX, plotY] = clientToPlot(svg, event.clientX, event.clientY);
      options.onDrag(activeHandle, nearestSampleIndex(plotX, plotY));
    });
    function endDrag(event) {
      if (!activeHandle) return;
      activeHandle = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    }
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);
    svg.addEventListener("touchstart", (event) => {
      if (event.target.closest("[data-handle]")) event.preventDefault();
    }, { passive: false });
    svg.addEventListener("click", (event) => {
      if (draggedSinceDown || event.target.closest("[data-handle]") || !options.onTapCurve) return;
      const [plotX, plotY] = clientToPlot(svg, event.clientX, event.clientY);
      options.onTapCurve(nearestSampleIndex(plotX, plotY), plotX, plotY);
    });
    svg.addEventListener("keydown", (event) => {
      const handleGroup = event.target.closest("[data-handle]");
      if (!handleGroup) return;
      const step = { ArrowRight: 4, ArrowUp: 4, ArrowLeft: -4, ArrowDown: -4 }[event.key];
      if (!step) return;
      event.preventDefault();
      options.onKeyStep(handleGroup.dataset.handle, step);
    });
  }

  /** A draggable, focusable handle (big invisible hit circle for 44px touch). */
  function drawHandle(group, point, handleName, ariaLabel) {
    const [x, y] = toScreen(point);
    const handleGroup = createSvgElement("g", {
      class: "curve-handle-group", "data-handle": handleName, tabindex: 0, role: "slider",
      "aria-label": ariaLabel, "aria-valuetext": formatRealPoint(point),
    });
    handleGroup.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 28, class: "curve-handle-hit" }));
    handleGroup.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 15, class: "curve-handle-ring" }));
    handleGroup.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 10, class: "curve-handle" }));
    group.appendChild(handleGroup);
    return [x, y];
  }

  Trapdoor.Curves = {
    CURVE_A, CURVE_B, PLOT_SIZE, SAMPLES,
    createSvgElement, toScreen, isOnPage, nearestSampleIndex, addRealPoints,
    formatReal, formatRealPoint, drawCurveBase, drawLineThrough, drawConstruction,
    placeLabels, clientToPlot, attachCurveDragging, drawHandle,
  };
})();
