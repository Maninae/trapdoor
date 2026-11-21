/*
 * Chapter 7 grid helpers (added to Trapdoor.Curves): the curve y^2 = x^3 - x + 1 on whole
 * numbers, with x and y both wrapping around a p-hour clock.
 *
 * - Exact integer math; division is multiplication by a clock inverse (Fermat: v^(p-2)).
 *   Clocks here are at most 97 hours, so plain Numbers never lose precision.
 * - The point "zero" (what a vertical line gives) is null.
 * - Load after curves-helpers.js, which defines Trapdoor.Curves and createSvgElement.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Curves = Trapdoor.Curves;
  const createSvgElement = Curves.createSvgElement;
  const CURVE_A = Curves.CURVE_A;
  const CURVE_B = Curves.CURVE_B;
  const PLOT_SIZE = Curves.PLOT_SIZE;

  const GRID_LEFT = 34;
  const GRID_TOP = 12;
  const GRID_SPAN = 352;

  function wrapNumber(value, prime) {
    return Number(Trapdoor.wrap(value, prime));
  }

  /** The clock inverse of `value`: the number that multiplies with it to land on 1. */
  function inverseOnClock(value, prime) {
    return Number(Trapdoor.powerOnClock(value, prime - 2, prime));
  }

  /** Exact P + Q on the p-hour grid; null means zero. */
  function addGridPoints(pointP, pointQ, prime) {
    if (pointP === null) return pointQ;
    if (pointQ === null) return pointP;
    if (pointP.x === pointQ.x && wrapNumber(pointP.y + pointQ.y, prime) === 0) return null;
    const slope = pointP.x === pointQ.x && pointP.y === pointQ.y
      ? wrapNumber((3 * pointP.x * pointP.x + CURVE_A) * inverseOnClock(wrapNumber(2 * pointP.y, prime), prime), prime)
      : wrapNumber((pointQ.y - pointP.y) * inverseOnClock(wrapNumber(pointQ.x - pointP.x, prime), prime), prime);
    const sumX = wrapNumber(slope * slope - pointP.x - pointQ.x, prime);
    return { x: sumX, y: wrapNumber(slope * (pointP.x - sumX) - pointP.y, prime) };
  }

  /**
   * k times P by the doubling shortcut. Returns { point, steps } where steps counts the
   * doublings plus additions used, so a widget can show how few were needed.
   */
  function multiplyGridPoint(pointP, multiple, prime) {
    let result = null;
    let doubled = pointP;
    let remaining = multiple;
    let steps = 0;
    while (remaining > 0) {
      if (remaining % 2 === 1) {
        if (result !== null) steps += 1;
        result = addGridPoints(result, doubled, prime);
      }
      remaining = Math.floor(remaining / 2);
      if (remaining > 0) { doubled = addGridPoints(doubled, doubled, prime); steps += 1; }
    }
    return { point: result, steps };
  }

  /** Every whole-number point on the curve for a p-hour clock (not counting zero). */
  function listGridPoints(prime) {
    const points = [];
    for (let x = 0; x < prime; x += 1) {
      const rightSide = wrapNumber(x * x * x + CURVE_A * x + CURVE_B, prime);
      for (let y = 0; y < prime; y += 1) {
        if ((y * y) % prime === rightSide) points.push({ x, y });
      }
    }
    return points;
  }

  function pointKey(point) {
    return point === null ? "zero" : `${point.x},${point.y}`;
  }

  function formatGridPoint(point) {
    return point === null ? "zero" : `(${point.x}, ${point.y})`;
  }

  function gridToScreen(point, prime) {
    const cell = GRID_SPAN / (prime - 1);
    return [GRID_LEFT + point.x * cell, GRID_TOP + GRID_SPAN - point.y * cell];
  }

  /** The grid point nearest a plot position, or null when nothing is within `maxDistance`. */
  function nearestGridPoint(points, prime, plotX, plotY, maxDistance) {
    let best = null;
    let bestDistance = maxDistance * maxDistance;
    points.forEach((point) => {
      const [x, y] = gridToScreen(point, prime);
      const distance = (x - plotX) ** 2 + (y - plotY) ** 2;
      if (distance <= bestDistance) { bestDistance = distance; best = point; }
    });
    return best;
  }

  let arrowCount = 0;

  /**
   * Draw the dot grid into `svg`.
   * options.marks: { pointKey: role } with role in visited / landed / start / target / miss.
   * options.chords: [[fromPoint, toPoint], ...]; the last is drawn bold.
   */
  function renderGrid(svg, options) {
    const { prime, points, marks = {}, chords = [] } = options;
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${PLOT_SIZE} ${PLOT_SIZE}`);
    arrowCount += 1;
    const arrowId = `grid-arrow-${arrowCount}`;
    const definitions = createSvgElement("defs");
    const marker = createSvgElement("marker", {
      id: arrowId, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto",
    });
    marker.appendChild(createSvgElement("path", { d: "M0 0 L10 5 L0 10 z", class: "grid-arrowhead" }));
    definitions.appendChild(marker);
    svg.appendChild(definitions);

    const padding = 8;
    svg.appendChild(createSvgElement("rect", {
      x: GRID_LEFT - padding, y: GRID_TOP - padding, width: GRID_SPAN + 2 * padding, height: GRID_SPAN + 2 * padding,
      class: "grid-frame",
    }));
    const axisLabels = [
      { x: GRID_LEFT, y: GRID_TOP + GRID_SPAN + 28, text: "0", anchor: "middle" },
      { x: GRID_LEFT + GRID_SPAN, y: GRID_TOP + GRID_SPAN + 28, text: String(prime - 1), anchor: "middle" },
      { x: GRID_LEFT + GRID_SPAN / 2, y: GRID_TOP + GRID_SPAN + 28, text: "x", anchor: "middle" },
      { x: GRID_LEFT - 14, y: GRID_TOP + GRID_SPAN + 5, text: "0", anchor: "end" },
      { x: GRID_LEFT - 14, y: GRID_TOP + 5, text: String(prime - 1), anchor: "end" },
      { x: GRID_LEFT - 14, y: GRID_TOP + GRID_SPAN / 2 + 5, text: "y", anchor: "end" },
    ];
    axisLabels.forEach(({ x, y, text, anchor }) => {
      const label = createSvgElement("text", { x, y, "text-anchor": anchor, class: "grid-axis-label" });
      label.textContent = text;
      svg.appendChild(label);
    });

    chords.forEach(([fromPoint, toPoint], chordIndex) => {
      const [fromX, fromY] = gridToScreen(fromPoint, prime);
      const [toX, toY] = gridToScreen(toPoint, prime);
      const length = Math.hypot(toX - fromX, toY - fromY) || 1;
      const shortenBy = Math.min(11, length / 3);
      svg.appendChild(createSvgElement("line", {
        x1: fromX, y1: fromY,
        x2: toX - ((toX - fromX) / length) * shortenBy, y2: toY - ((toY - fromY) / length) * shortenBy,
        class: chordIndex === chords.length - 1 ? "grid-chord grid-chord-latest" : "grid-chord",
        "marker-end": `url(#${arrowId})`,
      }));
    });

    const baseRadius = prime > 60 ? 2.6 : 4;
    const radiusByRole = { visited: baseRadius + 2, landed: baseRadius + 5, start: baseRadius + 4, target: baseRadius + 5, miss: baseRadius + 1 };
    points.forEach((point) => {
      const role = marks[pointKey(point)];
      const [x, y] = gridToScreen(point, prime);
      svg.appendChild(createSvgElement("circle", {
        cx: x, cy: y, r: role ? radiusByRole[role] : baseRadius, class: role ? `grid-dot grid-dot-${role}` : "grid-dot",
      }));
    });
  }

  Object.assign(Curves, {
    wrapNumber, addGridPoints, multiplyGridPoint, listGridPoints, pointKey,
    formatGridPoint, gridToScreen, nearestGridPoint, renderGrid,
  });
})();
