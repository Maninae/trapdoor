# Trapdoor

Hands-on math lessons: each chapter opens with something to touch, then explains it in a few short paragraphs. Static HTML, CSS, and vanilla JS. No build step, no framework, no npm.

## Layout

```
index.html                 landing page: list of chapters
favicon.svg
chapters/clock-math.html   chapter 1: modular arithmetic, ending on "forward easy, backward hard"
styles/shared.css          every style, as tokens + components (one file for the whole site)
scripts/core.js            window.Trapdoor namespace, BigInt clock math (wrap, powerOnClock), stepper control
scripts/clock-dial.js      Trapdoor.renderDial: the SVG clock face every widget reuses
scripts/glossary.js        tap-to-open term notes (button.term + aside.term-note)
scripts/widget-*.js        one file per interactive, each bound to one element id on the page
```

Scripts are classic `<script>` tags (not ES modules) so a page also works opened from disk. Load order on a page: `core.js`, `clock-dial.js`, `glossary.js`, then the widgets.

## Design choices

- Metaphor: a math notebook. Plain off-white page; each interactive is a figure on squared paper.
- Fonts: Literata (prose, headings, all numbers) and Atkinson Hyperlegible (controls and labels). One Google Fonts `<link>`; no third family.
- Color: every color is a token at the top of `shared.css`. Fountain-pen blue `--accent` marks whatever just moved or landed; red `--accent-2` is reserved for a challenge target. Light theme only, by design.
- Focal point per widget: the big blue landing number (`.readout-big`) next to the dial.
- One load-time motion: the opening clock hand sweeps to its first number. Everything else moves only in answer to a tap, and snaps under `prefers-reduced-motion`.
- Touch: every control is a real button or input at least 44px tall; no hover-only behavior.
- Copy rules: about 350 words of prose per chapter at most, no em-dashes, no closing summary, end on a one-line bridge question.
- Exact math: all clock arithmetic goes through BigInt in `core.js`.

## Adding a chapter

1. Copy `chapters/clock-math.html` as a starting shell (head, header, script tags) and replace the `<main>`.
2. Put each interactive in its own `scripts/widget-<name>.js`, bound to one `id` and reading `window.Trapdoor`. Keep each under about 300 lines.
3. Reuse `Trapdoor.renderDial` and `Trapdoor.createStepper` before writing new drawing or controls. New styles go into `shared.css` and read colors only from tokens.
4. Glossary popups: `<button type="button" class="term" aria-controls="note-x" aria-expanded="false">` plus a hidden `<aside class="term-note" id="note-x">` with a close button, placed right after the paragraph.
5. Add the chapter to the list in `index.html`.
6. Verify at 390px and 1440px in a real browser (overflow, tap sizes, console errors), and read the screenshots.
