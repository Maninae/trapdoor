/*
 * Paint mixing: Alice and Bob each add a secret color to a public yellow, swap the mixtures
 * in the open, add their secret color again, and end with the same pot. Eve, listening,
 * sees only the yellow and the two mixtures.
 *
 * Expects #paint-widget with .paint-scene, two .paint-picker[data-person] groups (each with
 * an empty .swatch-buttons), .readout, and buttons [data-action="next" | "reset"].
 *
 * - Paint colors are CSS custom properties (styles/chapter-shared-secret.css), read at load.
 * - A pot is a recipe (parts of each paint), and its color is computed from the recipe alone,
 *   so two pots with equal recipes are exactly the same color, whatever order they were poured.
 * - Mixing model: weighted geometric mean of linear-light channels, a rough stand-in for
 *   pigment (each paint absorbs some light), so yellow + blue comes out greenish.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SVG_NAMESPACE_ATTR = 'xmlns="http://www.w3.org/2000/svg"';
  const FIRST_STEP = 1;
  const LAST_STEP = 4;
  const MIN_LINEAR_CHANNEL = 0.02;
  const PAINT_NAMES = ["red", "blue", "green", "violet", "pink"];
  const DEFAULT_SECRET = { alice: "red", bob: "blue" };
  const PERSON_LABEL = { alice: "Alice", bob: "Bob" };
  const BLOB_PATH = "M21 3 C31 2 38 10 37 20 C36 30 29 37 19 37 C9 37 3 29 4 19 C5 10 12 4 21 3 Z";

  const widget = document.getElementById("paint-widget");
  const scene = widget.querySelector(".paint-scene");
  const readout = widget.querySelector(".readout");
  const nextButton = widget.querySelector('[data-action="next"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  const widgetStyle = getComputedStyle(widget);
  const paintHex = { public: widgetStyle.getPropertyValue("--paint-public").trim() };
  PAINT_NAMES.forEach((name) => {
    paintHex[name] = widgetStyle.getPropertyValue(`--paint-${name}`).trim();
  });

  const secret = { ...DEFAULT_SECRET };
  let step = FIRST_STEP;

  function hexToLinear(hex) {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    return channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  }

  function linearToHex(linearChannels) {
    return "#" + linearChannels.map((value) => {
      const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, encoded)) * 255).toString(16).padStart(2, "0");
    }).join("");
  }

  /** Color of a recipe like { public: 1, red: 1, blue: 1 } (parts of each paint). */
  function colorOfRecipe(recipe) {
    const totalParts = Object.values(recipe).reduce((sum, parts) => sum + parts, 0);
    const logSums = [0, 0, 0];
    for (const [paintName, parts] of Object.entries(recipe)) {
      hexToLinear(paintHex[paintName]).forEach((value, channel) => {
        logSums[channel] += parts * Math.log(Math.max(MIN_LINEAR_CHANNEL, value));
      });
    }
    return linearToHex(logSums.map((logSum) => Math.exp(logSum / totalParts)));
  }

  /** Pour recipe `extra` into recipe `pot`, returning a new recipe. */
  function pour(pot, extra) {
    const combined = { ...pot };
    for (const [paintName, parts] of Object.entries(extra)) combined[paintName] = (combined[paintName] || 0) + parts;
    return combined;
  }

  function blobSvg(color, label) {
    return `<svg class="paint-blob" ${SVG_NAMESPACE_ATTR} viewBox="0 0 40 40" role="img" aria-label="${label}">
      <path d="${BLOB_PATH}" fill="${color}"/></svg>`;
  }

  function hiddenBlobSvg(label) {
    return `<svg class="paint-blob paint-blob-hidden" ${SVG_NAMESPACE_ATTR} viewBox="0 0 40 40" role="img" aria-label="${label}">
      <circle cx="20" cy="20" r="16"/><text x="20" y="21" text-anchor="middle" dominant-baseline="central">?</text></svg>`;
  }

  function chip(color) {
    return `<span class="paint-chip" style="background:${color}"></span>`;
  }

  function cell({ blobs, recipeChips = null, caption, landed = false }) {
    const pairClass = blobs.length > 1 ? " paint-blob-pair" : "";
    const recipe = recipeChips ? `<span class="paint-recipe">${recipeChips.map(chip).join(" + ")}</span>` : "";
    return `<div class="paint-cell${landed ? " cell-landed" : ""}">
      <div class="paint-blobs${pairClass}">${blobs.join("")}</div>${recipe}
      <span class="paint-caption">${caption}</span></div>`;
  }

  /** Everything each person holds after each step, computed from the current secret choices. */
  function computePots() {
    const yellow = { public: 1 };
    const aliceMix = pour(yellow, { [secret.alice]: 1 });
    const bobMix = pour(yellow, { [secret.bob]: 1 });
    return {
      yellow,
      aliceMix,
      bobMix,
      aliceFinal: pour(bobMix, { [secret.alice]: 1 }),
      bobFinal: pour(aliceMix, { [secret.bob]: 1 }),
      eveGuess: pour(aliceMix, bobMix),
    };
  }

  function stepRows(pots) {
    const hex = (recipe) => colorOfRecipe(recipe);
    const yellowHex = hex(pots.yellow);
    const aliceSecretHex = paintHex[secret.alice];
    const bobSecretHex = paintHex[secret.bob];
    return [
      {
        title: "1. Everyone sees the public yellow",
        cells: [
          cell({ blobs: [blobSvg(yellowHex, "yellow")], caption: "public" }),
          cell({ blobs: [blobSvg(yellowHex, "yellow")], caption: "public" }),
          cell({ blobs: [blobSvg(yellowHex, "yellow")], caption: "public" }),
        ],
      },
      {
        title: "2. Each secretly stirs in a private color",
        cells: [
          cell({ blobs: [blobSvg(hex(pots.aliceMix), "Alice's mixture")], recipeChips: [yellowHex, aliceSecretHex], caption: `yellow + her ${secret.alice}` }),
          cell({ blobs: [hiddenBlobSvg("Eve cannot see")], caption: "sees nothing" }),
          cell({ blobs: [blobSvg(hex(pots.bobMix), "Bob's mixture")], recipeChips: [yellowHex, bobSecretHex], caption: `yellow + his ${secret.bob}` }),
        ],
      },
      {
        title: "3. They swap mixtures in the open",
        cells: [
          cell({ blobs: [blobSvg(hex(pots.bobMix), "Bob's mixture")], caption: "gets Bob's" }),
          cell({ blobs: [blobSvg(hex(pots.aliceMix), "Alice's mixture"), blobSvg(hex(pots.bobMix), "Bob's mixture")], caption: "sees both" }),
          cell({ blobs: [blobSvg(hex(pots.aliceMix), "Alice's mixture")], caption: "gets Alice's" }),
        ],
      },
      {
        title: "4. Each adds their private color again",
        cells: [
          cell({ blobs: [blobSvg(hex(pots.aliceFinal), "Alice's final color")], recipeChips: [hex(pots.bobMix), aliceSecretHex], caption: "<strong>shared</strong>", landed: true }),
          cell({ blobs: [blobSvg(hex(pots.eveGuess), "Eve's guess")], recipeChips: [hex(pots.aliceMix), hex(pots.bobMix)], caption: "her best guess" }),
          cell({ blobs: [blobSvg(hex(pots.bobFinal), "Bob's final color")], recipeChips: [hex(pots.aliceMix), bobSecretHex], caption: "<strong>shared</strong>", landed: true }),
        ],
      },
    ];
  }

  const READOUT_BY_STEP = [
    null,
    () => `<span class="readout-lead">Yellow is public. Eve sees it too.</span>
           <span class="readout-detail">Pick secret colors for Alice and Bob, then tap Next step.</span>`,
    () => `<span class="readout-lead">Each pot is now half yellow, half secret.</span>
           <span class="readout-detail">These mixes happen at home, where Eve cannot look.</span>`,
    () => `<span class="readout-lead">Eve now holds both mixtures.</span>
           <span class="readout-detail">Can she get the shared color from them? Take one more step.</span>`,
    (pots) => `<span class="readout-lead">Both end with the same color
             <span class="readout-swatch" style="background:${colorOfRecipe(pots.aliceFinal)}"></span></span>
           <span class="readout-detail">Each pot is 1 part yellow, 1 part ${secret.alice}, 1 part ${secret.bob}.
             Eve's guess has 2 parts yellow, so it comes out <span class="readout-swatch" style="background:${colorOfRecipe(pots.eveGuess)}"></span> instead.</span>`,
  ];

  function render({ animateNewRow }) {
    const pots = computePots();
    const rows = stepRows(pots);
    const heads = `<div class="paint-column-head head-alice"><span class="name-alice">Alice</span></div>
      <div class="paint-column-head head-eve"><span class="name-eve">Eve</span> listens</div>
      <div class="paint-column-head head-bob"><span class="name-bob">Bob</span></div>`;
    scene.innerHTML = heads + rows.slice(0, step).map((row) =>
      `<p class="paint-step-title">${row.title}</p>${row.cells.join("")}`).join("");
    // Only the newest row (its title plus three cells) fades in; earlier rows stay put.
    const rowNodes = Array.from(scene.querySelectorAll(".paint-step-title, .paint-cell"));
    const stillNodes = animateNewRow ? rowNodes.slice(0, -4) : rowNodes;
    stillNodes.forEach((node) => { node.style.animation = "none"; });
    readout.innerHTML = READOUT_BY_STEP[step](pots);
    nextButton.disabled = step >= LAST_STEP;
    widget.dataset.step = String(step);
    widget.dataset.aliceFinal = colorOfRecipe(pots.aliceFinal);
    widget.dataset.bobFinal = colorOfRecipe(pots.bobFinal);
    widget.dataset.eveGuess = colorOfRecipe(pots.eveGuess);
  }

  function buildPicker(person) {
    const container = widget.querySelector(`.paint-picker[data-person="${person}"] .swatch-buttons`);
    PAINT_NAMES.forEach((paintName) => {
      const button = document.createElement("button");
      button.type = "button";
      button.style.background = paintHex[paintName];
      button.dataset.paint = paintName;
      button.setAttribute("aria-label", `${PERSON_LABEL[person]}: ${paintName}`);
      button.setAttribute("aria-pressed", String(paintName === secret[person]));
      button.addEventListener("click", () => {
        secret[person] = paintName;
        container.querySelectorAll("button").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
        render({ animateNewRow: false });
      });
      container.appendChild(button);
    });
  }

  buildPicker("alice");
  buildPicker("bob");

  nextButton.addEventListener("click", () => {
    step = Math.min(LAST_STEP, step + 1);
    render({ animateNewRow: !Trapdoor.prefersReducedMotion() });
    if (step >= LAST_STEP) resetButton.focus();
  });
  resetButton.addEventListener("click", () => {
    step = FIRST_STEP;
    render({ animateNewRow: false });
  });

  render({ animateNewRow: false });
})();
