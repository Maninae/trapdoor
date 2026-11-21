/*
 * Lattice helpers for chapter 9: two arrow pairs that build the same grid of dots, exact
 * nearest-dot search, and one SVG scene renderer both lattice widgets reuse.
 *
 * - TIDY and SKEWED generate exactly the same dots: SKEWED = U * TIDY with U = [[2,1],[3,2]],
 *   and det U = 1, so each pair can rebuild the other with whole-number recipes.
 * - Points are plain {x, y} in lattice units; toSvg maps them into a 400 x 400 viewBox.
 * - Load after core.js; adds Trapdoor.Lattice.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SVG_SIZE = 400;
  const VIEW_HALF_UNITS = 8.5;
  const PIXELS_PER_UNIT = SVG_SIZE / (2 * VIEW_HALF_UNITS);
  const DOT_RADIUS = 4.5;
  const ARROWHEAD_LENGTH = 13;
  const ARROWHEAD_HALF_WIDTH = 6.5;
  // Coefficient range for enumerating dots; wide enough to cover the view with the tidy pair.
  const ENUMERATION_RANGE = 40;

  const TIDY = { name: "tidy", a: { x: 3, y: 1 }, b: { x: -1, y: 2 } };
  const SKEWED = { name: "skewed", a: { x: 5, y: 4 }, b: { x: 7, y: 7 } };

  function combine(basis, coefA, coefB) {
    return {
      x: coefA * basis.a.x + coefB * basis.b.x,
      y: coefA * basis.a.y + coefB * basis.b.y,
    };
  }

  /** Real-valued recipe (coefA, coefB) with coefA*a + coefB*b = point (Cramer's rule). */
  function coefficientsOf(basis, point) {
    const determinant = basis.a.x * basis.b.y - basis.a.y * basis.b.x;
    return {
      coefA: (point.x * basis.b.y - point.y * basis.b.x) / determinant,
      coefB: (basis.a.x * point.y - basis.a.y * point.x) / determinant,
    };
  }

  function distance(pointP, pointQ) {
    return Math.hypot(pointP.x - pointQ.x, pointP.y - pointQ.y);
  }

  function isInView(point, marginUnits = 0) {
    const limit = VIEW_HALF_UNITS - marginUnits;
    return Math.abs(point.x) <= limit && Math.abs(point.y) <= limit;
  }

  /** Every dot of the lattice (enumerated with the tidy pair), optionally only those in view. */
  function allDots({ inViewOnly }) {
    const dots = [];
    for (let coefA = -ENUMERATION_RANGE; coefA <= ENUMERATION_RANGE; coefA += 1) {
      for (let coefB = -ENUMERATION_RANGE; coefB <= ENUMERATION_RANGE; coefB += 1) {
        const dot = combine(TIDY, coefA, coefB);
        if (!inViewOnly || isInView(dot)) dots.push(dot);
      }
    }
    return dots;
  }

  /** The true nearest dot to `point`, by checking every dot (exact; ties keep the first). */
  function nearestDot(point) {
    let best = null;
    let bestDistance = Infinity;
    allDots({ inViewOnly: false }).forEach((dot) => {
      const dotDistance = distance(dot, point);
      if (dotDistance < bestDistance - 1e-9) {
        best = dot;
        bestDistance = dotDistance;
      }
    });
    return { dot: best, distance: bestDistance };
  }

  function toSvg(point) {
    return {
      x: SVG_SIZE / 2 + point.x * PIXELS_PER_UNIT,
      y: SVG_SIZE / 2 - point.y * PIXELS_PER_UNIT,
    };
  }

  function format(value) {
    return Number(value.toFixed(2)).toString();
  }

  /** SVG for one arrow from `from` to `to` (lattice units), with a drawn arrowhead. */
  function arrowMarkup(from, to, className) {
    const start = toSvg(from);
    const end = toSvg(to);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length < 1) return "";
    const unitX = (end.x - start.x) / length;
    const unitY = (end.y - start.y) / length;
    const baseX = end.x - unitX * ARROWHEAD_LENGTH;
    const baseY = end.y - unitY * ARROWHEAD_LENGTH;
    const head = [
      [end.x, end.y],
      [baseX - unitY * ARROWHEAD_HALF_WIDTH, baseY + unitX * ARROWHEAD_HALF_WIDTH],
      [baseX + unitY * ARROWHEAD_HALF_WIDTH, baseY - unitX * ARROWHEAD_HALF_WIDTH],
    ].map((pair) => pair.map(format).join(",")).join(" ");
    return `<g class="${className}">
      <line x1="${format(start.x)}" y1="${format(start.y)}" x2="${format(baseX)}" y2="${format(baseY)}"/>
      <polygon points="${head}"/></g>`;
  }

  /** Label placed just past an arrow's tip, nudged back inside the frame. */
  function arrowLabelMarkup(tip, text, className) {
    const position = toSvg(tip);
    const length = Math.hypot(tip.x, tip.y) || 1;
    const labelX = Math.min(SVG_SIZE - 14, Math.max(14, position.x + (tip.x / length) * 16));
    const labelY = Math.min(SVG_SIZE - 8, Math.max(20, position.y - (tip.y / length) * 16 + 6));
    return `<text class="${className}" x="${format(labelX)}" y="${format(labelY)}" text-anchor="middle">${text}</text>`;
  }

  /**
   * Draw the lattice scene into `svg`.
   *
   * Args:
   *     options.basis: TIDY or SKEWED; its two arrows are drawn from the origin.
   *     options.showDots: draw every dot in view.
   *     options.recipe: {coefA, coefB}; draws the walk coefA*A then coefB*B and marks the landing.
   *     options.target: optional red point (the nearest-dot game).
   *     options.nearest: optional dot to ring as the true nearest.
   */
  function drawScene(svg, options) {
    const { basis, showDots, recipe, target, nearest } = options;
    svg.setAttribute("viewBox", `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
    const origin = { x: 0, y: 0 };
    const parts = [`<rect class="lattice-frame" x="0.5" y="0.5" width="${SVG_SIZE - 1}" height="${SVG_SIZE - 1}" rx="8"/>`];

    if (showDots) {
      allDots({ inViewOnly: true }).forEach((dot) => {
        const position = toSvg(dot);
        parts.push(`<circle class="lattice-dot" cx="${format(position.x)}" cy="${format(position.y)}" r="${DOT_RADIUS}"/>`);
      });
    }

    if (recipe && (recipe.coefA !== 0 || recipe.coefB !== 0)) {
      const corner = combine(basis, recipe.coefA, 0);
      const landing = combine(basis, recipe.coefA, recipe.coefB);
      parts.push(`<polyline class="lattice-walk" points="${[origin, corner, landing]
        .map((point) => { const p = toSvg(point); return `${format(p.x)},${format(p.y)}`; }).join(" ")}"/>`);
    }

    parts.push(arrowMarkup(origin, basis.a, "lattice-arrow lattice-arrow-a"));
    parts.push(arrowMarkup(origin, basis.b, "lattice-arrow lattice-arrow-b"));
    parts.push(arrowLabelMarkup(basis.a, "A", "lattice-label lattice-label-a"));
    parts.push(arrowLabelMarkup(basis.b, "B", "lattice-label lattice-label-b"));
    const originPosition = toSvg(origin);
    parts.push(`<circle class="lattice-origin" cx="${originPosition.x}" cy="${originPosition.y}" r="${DOT_RADIUS + 1.5}"/>`);

    if (nearest) {
      const position = toSvg(nearest);
      parts.push(`<circle class="lattice-nearest" cx="${format(position.x)}" cy="${format(position.y)}" r="11"/>`);
    }
    if (target) {
      const position = toSvg(target);
      parts.push(`<circle class="lattice-target" cx="${format(position.x)}" cy="${format(position.y)}" r="7"/>`);
    }
    if (recipe) {
      const landing = combine(basis, recipe.coefA, recipe.coefB);
      if (isInView(landing)) {
        const position = toSvg(landing);
        parts.push(`<circle class="lattice-landing" cx="${format(position.x)}" cy="${format(position.y)}" r="${DOT_RADIUS + 2.5}"/>`);
      }
    }
    svg.innerHTML = parts.join("");
  }

  /** "2 × A + 1 × B" style recipe text, with a real minus sign. */
  function recipeText(recipe) {
    const term = (coefficient, letter) => `${coefficient < 0 ? "−" : ""}${Math.abs(coefficient)}&nbsp;&times;&nbsp;${letter}`;
    const joiner = recipe.coefB < 0 ? " &minus; " : " + ";
    return `${term(recipe.coefA, "A")}${joiner}${Math.abs(recipe.coefB)}&nbsp;&times;&nbsp;B`;
  }

  Trapdoor.Lattice = {
    TIDY,
    SKEWED,
    VIEW_HALF_UNITS,
    combine,
    coefficientsOf,
    distance,
    isInView,
    nearestDot,
    drawScene,
    recipeText,
  };
})();
