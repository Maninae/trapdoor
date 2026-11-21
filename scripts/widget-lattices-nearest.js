/*
 * Nearest-dot game: a red point sits just off an invisible grid. The reader only has the two
 * arrows and must find whole-number steps that land on the dot nearest the red point.
 *
 * Expects #lattice-nearest-widget with .lattice-svg, .readout, .widget-controls, .moves-count,
 * pair buttons [data-basis], and actions [data-action="check" | "round" | "dots" | "new"].
 *
 * - The true nearest dot is found by checking every dot (Lattice.nearestDot), never assumed.
 * - Puzzles are drawn so that the "round the recipe" shortcut lands on the nearest dot with
 *   the tidy pair and misses with the skewed pair, which is the lesson; the readout still
 *   reports what rounding actually did.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Lattice = Trapdoor.Lattice;
  const MAX_STEPS = 30;
  const TARGET_HALF_RANGE = 6.5;
  const MIN_TARGET_GAP = 0.7;
  const MAX_PUZZLE_ATTEMPTS = 500;

  const widget = document.getElementById("lattice-nearest-widget");
  const svg = widget.querySelector(".lattice-svg");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");
  const movesCount = widget.querySelector(".moves-count");
  const basisButtons = Array.from(widget.querySelectorAll("[data-basis]"));
  const checkButton = widget.querySelector('[data-action="check"]');
  const roundButton = widget.querySelector('[data-action="round"]');
  const dotsButton = widget.querySelector('[data-action="dots"]');
  const newButton = widget.querySelector('[data-action="new"]');

  let basis = Lattice.TIDY;
  let recipe = { coefA: 0, coefB: 0 };
  let puzzle = null;
  let moves = 0;
  let showDots = false;
  let verdict = null;

  function onStep() {
    recipe = { coefA: stepperA.getValue(), coefB: stepperB.getValue() };
    moves += 1;
    verdict = null;
    render();
  }

  const stepperA = Trapdoor.createStepper({
    container: controls, label: "Steps along A", min: -MAX_STEPS, max: MAX_STEPS, value: 0, onChange: onStep,
  });
  const stepperB = Trapdoor.createStepper({
    container: controls, label: "Steps along B", min: -MAX_STEPS, max: MAX_STEPS, value: 0, onChange: onStep,
  });

  function roundedRecipe(forBasis, point) {
    const exact = Lattice.coefficientsOf(forBasis, point);
    return { coefA: Math.round(exact.coefA), coefB: Math.round(exact.coefB) };
  }

  function sameDot(pointP, pointQ) {
    return Lattice.distance(pointP, pointQ) < 1e-9;
  }

  function makePuzzle() {
    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt += 1) {
      const target = {
        x: Math.round((Math.random() * 2 - 1) * TARGET_HALF_RANGE * 10) / 10,
        y: Math.round((Math.random() * 2 - 1) * TARGET_HALF_RANGE * 10) / 10,
      };
      const nearest = Lattice.nearestDot(target);
      if (nearest.distance < MIN_TARGET_GAP) continue;
      const tidyGuess = Lattice.combine(Lattice.TIDY, ...Object.values(roundedRecipe(Lattice.TIDY, target)));
      const skewedGuess = Lattice.combine(Lattice.SKEWED, ...Object.values(roundedRecipe(Lattice.SKEWED, target)));
      if (sameDot(tidyGuess, nearest.dot) && !sameDot(skewedGuess, nearest.dot)) {
        return { target, nearest: nearest.dot, nearestDistance: nearest.distance };
      }
    }
    const target = { x: 1.4, y: 2.6 };
    const nearest = Lattice.nearestDot(target);
    return { target, nearest: nearest.dot, nearestDistance: nearest.distance };
  }

  function resetAttempt() {
    recipe = { coefA: 0, coefB: 0 };
    stepperA.setValue(0);
    stepperB.setValue(0);
    moves = 0;
    verdict = null;
    showDots = false;
  }

  function render() {
    const landing = Lattice.combine(basis, recipe.coefA, recipe.coefB);
    const gap = Lattice.distance(landing, puzzle.target);
    const solved = verdict === "hit";
    Lattice.drawScene(svg, {
      basis,
      showDots,
      recipe,
      target: puzzle.target,
      nearest: solved || showDots ? puzzle.nearest : null,
    });
    svg.setAttribute("aria-label", `The ${basis.name} arrows A and B, your landing spot, and a red target point.`);

    let lead;
    if (verdict === "hit") lead = `Nearest dot found in ${moves} ${moves === 1 ? "move" : "moves"}.`;
    else if (verdict === "miss") lead = "Not the nearest. A closer dot exists.";
    else if (verdict === "round-hit") lead = "Rounding the recipe landed on the nearest dot.";
    else if (verdict === "round-miss") lead = "Rounding the recipe missed. A closer dot exists.";
    else lead = "Land on the dot nearest the red point.";
    const where = Lattice.isInView(landing) ? "" : " Your spot is off the page.";
    readout.innerHTML = `
      <span class="readout-lead">${lead}</span>
      <span class="readout-detail">${Lattice.recipeText(recipe)}. Distance to the red point: ${gap.toFixed(2)}.${where}</span>`;

    movesCount.textContent = String(moves);
    basisButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.basis === basis.name));
    });
    dotsButton.textContent = showDots ? "Hide the dots" : "Show the dots";
    checkButton.disabled = solved;
  }

  basisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextBasis = button.dataset.basis === "tidy" ? Lattice.TIDY : Lattice.SKEWED;
      if (nextBasis === basis) return;
      basis = nextBasis;
      resetAttempt();
      render();
    });
  });

  checkButton.addEventListener("click", () => {
    const landing = Lattice.combine(basis, recipe.coefA, recipe.coefB);
    const gap = Lattice.distance(landing, puzzle.target);
    verdict = gap <= puzzle.nearestDistance + 1e-9 ? "hit" : "miss";
    render();
  });

  roundButton.addEventListener("click", () => {
    recipe = roundedRecipe(basis, puzzle.target);
    stepperA.setValue(recipe.coefA);
    stepperB.setValue(recipe.coefB);
    recipe = { coefA: stepperA.getValue(), coefB: stepperB.getValue() };
    moves += 1;
    const landing = Lattice.combine(basis, recipe.coefA, recipe.coefB);
    verdict = sameDot(landing, puzzle.nearest) ? "round-hit" : "round-miss";
    render();
  });

  dotsButton.addEventListener("click", () => {
    showDots = !showDots;
    render();
  });

  newButton.addEventListener("click", () => {
    puzzle = makePuzzle();
    resetAttempt();
    render();
  });

  puzzle = makePuzzle();
  render();
})();
