/*
 * One small drawn glyph per chapter for the landing map, keyed by chapter slug.
 *
 * - Each value is the inside of a 64 x 64 <svg>. Strokes use currentColor (ink); exactly one
 *   mark per glyph carries class "glyph-accent" (the notebook's blue for what just landed).
 * - Drawn to echo the chapter's own widget: the cipher wheel, the clock, the padlock, the curve.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});
  const S = 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
  const SOFT = 'fill="none" stroke="currentColor" stroke-width="2" opacity="0.35"';

  // The chapter 7 curve y^2 = x^3 - x + 1, plotted for x in [-1.32, 2.2] into the 64 x 64 box.
  const curveX = (x) => (10 + (x + 1.33) * 13.5).toFixed(1);
  const curveY = (x, sign) => (32 - sign * Math.sqrt(Math.max(0, x * x * x - x + 1)) * 8.2).toFixed(1);
  function curvePath() {
    const xs = [];
    for (let step = 0; step <= 40; step += 1) xs.push(-1.3247 + (2.2 + 1.3247) * (step / 40) ** 2);
    const upper = xs.slice().reverse().map((x) => `${curveX(x)} ${curveY(x, 1)}`);
    const lower = xs.slice(1).map((x) => `${curveX(x)} ${curveY(x, -1)}`);
    return `M${upper.concat(lower).join(" L")}`;
  }

  // A skewed dot grid, its two arrows from the corner dot, a red target, and the nearest dot in blue.
  function latticeGlyph() {
    const dots = [];
    for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) dots.push([6 + 13 * i + 5 * j, 54 - 12 * j]);
    const target = [32, 37];
    const nearest = dots.reduce((best, dot) => (Math.hypot(dot[0] - target[0], dot[1] - target[1])
      < Math.hypot(best[0] - target[0], best[1] - target[1]) ? dot : best));
    const dotMarks = dots.filter((dot) => dot !== nearest)
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="currentColor" opacity="0.55"/>`).join("");
    return `${dotMarks}
      <path d="M6 54 L19 54 M6 54 L11 42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${target[0]}" cy="${target[1]}" r="2.4" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/>
      <circle cx="${nearest[0]}" cy="${nearest[1]}" r="2.8" class="glyph-accent"/>`;
  }

  Trapdoor.GLYPHS = {
    "secret-codes": `
      <circle cx="32" cy="32" r="27" ${SOFT}/>
      <circle cx="32" cy="32" r="13" ${S}/>
      <text x="32" y="16.5" text-anchor="middle" class="glyph-text">A</text>
      <text x="32" y="36.5" text-anchor="middle" class="glyph-text glyph-accent-text">D</text>
      <path d="M41 22.5 a13 13 0 0 1 3.5 5" ${S}/>`,
    "scrambling": `
      ${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((col) => {
        const on = [[1, 0, 1, 1, 0], [0, 1, 1, 0, 0], [1, 1, 0, 1, 0]][row][col];
        const cls = row === 2 && on ? 'class="glyph-accent"' : (on ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.45"');
        return `<rect x="${8 + col * 10}" y="${12 + row * 15}" width="8" height="8" rx="1.5" ${cls}/>`;
      }).join("")).join("")}
      <line x1="8" y1="39" x2="56" y2="39" stroke="currentColor" stroke-width="1.5" opacity="0.45"/>`,
    "clock-math": `
      <circle cx="32" cy="32" r="26" ${SOFT}/>
      <line x1="32" y1="32" x2="32" y2="12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3" fill="currentColor"/>
      <circle cx="54.5" cy="45" r="5" class="glyph-accent"/>`,
    "shared-secret": `
      <circle cx="16" cy="22" r="9" ${S}/>
      <circle cx="48" cy="22" r="9" ${S}/>
      <path d="M22 30 L29 41 M42 30 L35 41" ${S}/>
      <circle cx="32" cy="48" r="9" class="glyph-accent"/>`,
    "two-keys": `
      <path d="M21 30 V21 a11 11 0 0 1 22 0 V30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <rect x="13" y="30" width="38" height="27" rx="5" ${S}/>
      <circle cx="32" cy="41" r="4" class="glyph-accent"/>
      <line x1="32" y1="44" x2="32" y2="50" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>`,
    "signatures": `
      <rect x="9" y="8" width="38" height="48" rx="4" ${SOFT}/>
      <path d="M16 20 H40 M16 28 H36" ${SOFT}/>
      <path d="M15 44 c5-10 8 6 13-2 s6-6 9 2" ${S}/>
      <circle cx="49" cy="46" r="10" class="glyph-accent"/>
      <path d="M44 46 l3.5 3.5 l6.5-7" fill="none" stroke="var(--surface)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    "curves": `
      <line x1="4" y1="32" x2="60" y2="32" ${SOFT}/>
      <path d="${curvePath()}" ${S}/>
      <circle cx="${curveX(-1)}" cy="${curveY(-1, 1)}" r="3.5" fill="currentColor"/>
      <circle cx="${curveX(1.6)}" cy="${curveY(1.6, -1)}" r="5" class="glyph-accent"/>`,
    "quantum": `
      <line x1="6" y1="54" x2="58" y2="54" ${SOFT}/>
      ${[34, 14, 24, 34, 14, 24, 34, 14].map((h, i) => `<rect x="${7 + i * 6.5}" y="${54 - h}" width="4.5" height="${h}" rx="1" ${i === 3 ? 'class="glyph-accent"' : 'fill="currentColor" opacity="0.55"'}/>`).join("")}
`,
    "lattices": latticeGlyph(),
    "hash-signatures": `
      <path d="M32 14 L18 30 M32 14 L46 30 M18 30 L11 47 M18 30 L25 47 M46 30 L39 47 M46 30 L53 47" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
      <path d="M32 14 L18 30 L25 47" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="26" y="8" width="12" height="10" rx="2" ${S}/>
      ${[[12, 25], [40, 25], [5, 42], [33, 42], [47, 42]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="10" rx="2" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>`).join("")}
      <rect x="19" y="42" width="12" height="10" rx="2" class="glyph-accent"/>`,
    "big-picture": `
      <line x1="10" y1="8" x2="10" y2="58" ${SOFT}/>
      <rect x="10" y="12" width="12" height="7" rx="1.5" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="24" width="6" height="7" rx="1.5" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="36" width="26" height="7" rx="1.5" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="48" width="46" height="7" rx="1.5" class="glyph-accent"/>`,
  };
})();
