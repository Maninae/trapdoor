# Trapdoor

Hands-on cryptography lessons for high-school students: how secrets stay secret online, from letter-shift codes to the math that is replacing today's systems. Each chapter opens with something to touch, then explains it in a few short paragraphs. Static HTML, CSS, and vanilla JS. No build step, no framework, no npm. Live at https://maninae.github.io/trapdoor/.

## Layout

```
index.html                  landing page: the name, one line, then the map of arcs and chapter cards
404.html                    not-found page (root-relative /trapdoor/ paths; Pages serves it at any depth)
chapters/<slug>.html        one page per chapter (11), each standalone
scripts/chapters.js         THE chapter list: slug, number, title, hook, arc (plus the four arcs)
scripts/chapter-nav.js      previous / next cards at the bottom of every chapter, from chapters.js
scripts/landing.js          renders the index map from chapters.js + chapter-glyphs.js
scripts/chapter-glyphs.js   one small 64x64 SVG glyph per chapter for the index cards
scripts/core.js             window.Trapdoor namespace, BigInt clock math, stepper control
scripts/clock-dial.js       Trapdoor.renderDial: the SVG clock face several widgets reuse
scripts/glossary.js         tap-to-open term notes (button.term + aside.term-note)
scripts/<chapter>-helpers.js  per-chapter math and drawing helpers
scripts/widget-*.js         one file per interactive, each bound to one element id on its page
styles/tokens.css           every color, font, size and spacing token (incl. Alice / Bob / Eve hues)
styles/base.css             reset, page frame, headings, prose, chapter ending
styles/widgets.css          figure frame on squared paper, dial marks, readouts, .widget-stack
styles/controls.css         buttons, steppers, text fields, hop/try lists, forward demo
styles/components.css       glossary notes, .card, .fact-card, .data-table, people names/tags, .step-list, chapter nav
styles/landing.css          index and 404 only
styles/chapter-<slug>.css   what only that chapter uses
assets/preview.png          1200x630 link-preview image (made from a live widget capture)
assets/icons/               favicon-32, apple-touch-icon, 192/512 and maskable icons (from favicon.svg)
favicon.svg, favicon.ico, manifest.webmanifest, sitemap.xml, robots.txt
```

Arcs and chapters, in reading order:

| Arc | Chapters |
|---|---|
| 1 Shared secrets | 1 secret-codes, 2 scrambling |
| 2 Strangers | 3 clock-math, 4 shared-secret, 5 two-keys, 6 signatures |
| 3 Curves | 7 curves |
| 4 After quantum | 8 quantum, 9 lattices, 10 hash-signatures, 11 big-picture |

## How pages load

- Stylesheets, in order: `tokens`, `base`, `widgets`, `controls`, `components`, then `chapter-<slug>.css`. Chapter sheets load last so their overrides win; never move a chapter rule above the shared layer.
- Scripts are classic `<script>` tags (not ES modules) so a page also works opened from disk. Order: `core.js`, `clock-dial.js` (if used), `glossary.js`, helpers, widgets, then `chapters.js` and `chapter-nav.js` last.
- Without JS a chapter still shows its text and an "All chapters" link; the index still shows a plain list of all 11 chapter links (replaced by the map when JS runs).

## Design rules (as built)

- Metaphor: a math notebook. Plain off-white page; each interactive is a figure on squared paper.
- Fonts: Literata (prose, headings, all numbers) and Atkinson Hyperlegible (controls and labels). One Google Fonts `<link>`; no third family. Atkinson's zero is slashed; that is the font, not a collision.
- Color: every color is a token in `tokens.css` (the chapter 4 paint colors live in `chapter-shared-secret.css`). Fountain-pen blue `--accent` marks whatever just moved or landed; red `--accent-2` is reserved for a challenge target; `--ok` green for a passing check. Light theme only, by design.
- People keep one hue on every page: Alice teal (`--person-alice`), Bob violet (`--person-bob`), Eve soft ink (`--person-eve`). Use `.name-*` for names, `.tag-*` for "who may see this", `.step-list li.step-alice|bob` for who-did-what rows. Public values carry no person hue.
- Focal point per widget: the big blue landing number (`.readout-big`). On the index: the name, then chapter 1's card (the only card with an accent border and squared paper).
- Motion: one load-time motion (the opening clock hand sweep). Everything else moves only in answer to a tap, and snaps under `prefers-reduced-motion`.
- Labels in plots never sit on a stroke: the curve plots place labels with `curves-labels.js`, which prefers slots clear of the curve, lines and dots.
- Touch: every control is a real button or input at least 44px tall; no hover-only behavior.
- Copy: about 350 words of prose per chapter at most, no em-dashes, no closing summary, end on a one-line bridge question.
- Exact math: clock arithmetic goes through BigInt.
- Size: keep every JS and CSS file under about 300 lines; split by responsibility before that.

## Adding a chapter

1. Copy an existing chapter page as the shell (head with its SEO tags, header, the five shared stylesheets, the `chapter-nav` block, the script tags) and replace the `<main>`.
2. Add one entry to `scripts/chapters.js` in reading order; renumber later entries. This drives the prev/next cards and the index map.
3. Set the page's `<span class="chapter-number">`, `<title>`, meta description, canonical, and `og:` / `twitter:` URLs and titles to match.
4. Add a glyph for the slug to `scripts/chapter-glyphs.js` (64x64, ink strokes, exactly one `glyph-accent` mark).
5. Add the link to the plain fallback list in `index.html` and the URL to `sitemap.xml`.
6. Put each interactive in its own `scripts/widget-<name>.js`, bound to one `id`. Reuse `Trapdoor.renderDial`, `Trapdoor.createStepper`, and the shared components (`.card`, `.data-table`, `.step-list`, `.tag`) before writing new ones. Chapter-only styles go in `styles/chapter-<slug>.css` and read colors only from tokens.
7. Glossary popups: `<button type="button" class="term" aria-controls="note-x" aria-expanded="false">` plus a hidden `<aside class="term-note" id="note-x">` with a close button, right after the paragraph.
8. Check every "chapter N" reference in prose still points at the right page.
9. Verify at 390px and 1440px in a real browser (overflow, tap sizes, console errors, the prev/next chain), and read the screenshots.

## Run locally

`python3 -m http.server 8000` from the repo root, then open http://localhost:8000/. The 404 page only renders styled under a `/trapdoor/` path (as on GitHub Pages).
