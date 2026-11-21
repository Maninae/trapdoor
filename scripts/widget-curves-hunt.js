/*
 * "How many hops?": the reader sees the start dot P and an end dot kP on a 97-hour grid and
 * has to find k. Forward jumps use the doubling shortcut; backward has no shortcut.
 *
 * Expects #curve-hunt-widget with svg.curve-plot, .readout, .guess-form (input + submit),
 * .tries-count, .try-list, and buttons [data-action="computer" | "new"].
 *
 * - P = (0, 1) visits all 97 dots before reaching zero on hop 98, so every end dot has
 *   exactly one answer in 1..97 (any answer plus a multiple of 98 also lands there).
 * - The computer's search adds P once per try, the only obvious backward method.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Curves = Trapdoor.Curves;
  const HUNT_PRIME = 97;
  const START_POINT = { x: 0, y: 1 };
  const START_POINT_ORDER = 98;
  const MAX_GUESS = 999;
  const COMPUTER_TRY_INTERVAL_MS = 90;

  const widget = document.getElementById("curve-hunt-widget");
  const svg = widget.querySelector(".curve-plot");
  const readout = widget.querySelector(".readout");
  const guessForm = widget.querySelector(".guess-form");
  const guessInput = guessForm.querySelector("input");
  const guessButton = guessForm.querySelector("button");
  const triesCount = widget.querySelector(".tries-count");
  const tryList = widget.querySelector(".try-list");
  const computerButton = widget.querySelector('[data-action="computer"]');
  const newPuzzleButton = widget.querySelector('[data-action="new"]');
  const gridPoints = Curves.listGridPoints(HUNT_PRIME);

  let puzzle = null;
  let computerTimerId = null;

  function randomInteger(minInclusive, maxInclusive) {
    return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
  }

  function startNewPuzzle() {
    clearInterval(computerTimerId);
    computerTimerId = null;
    const secretHops = randomInteger(5, START_POINT_ORDER - 2);
    puzzle = {
      target: Curves.multiplyGridPoint(START_POINT, secretHops, HUNT_PRIME).point,
      tries: [],
      solvedBy: null,
      computerLanding: null,
    };
    guessInput.value = "";
    render();
  }

  function recordTry(hopCount, landing, steps, triedBy) {
    puzzle.tries.push({ hopCount, landing, steps, triedBy });
    if (Curves.pointKey(landing) === Curves.pointKey(puzzle.target)) puzzle.solvedBy = triedBy;
  }

  function render() {
    const { target, tries, solvedBy } = puzzle;
    const marks = {};
    tries.forEach(({ landing }) => { if (landing) marks[Curves.pointKey(landing)] = "miss"; });
    const lastTry = tries[tries.length - 1];
    if (lastTry && lastTry.landing) marks[Curves.pointKey(lastTry.landing)] = "landed";
    marks[Curves.pointKey(START_POINT)] = "start";
    marks[Curves.pointKey(target)] = solvedBy ? "landed" : "target";
    Curves.renderGrid(svg, { prime: HUNT_PRIME, points: gridPoints, marks });
    svg.setAttribute("aria-label",
      `${gridPoints.length} dots on a 97 by 97 grid. Start P at (0, 1), end dot at ${Curves.formatGridPoint(target)}.`);

    if (solvedBy) {
      const who = solvedBy === "reader" ? "You found it" : "The computer found it";
      // Count only the winner's own tries, so the reader's guesses never inflate the computer's search.
      const solverTryCount = tries.filter(({ triedBy }) => triedBy === solvedBy).length;
      const backwardNote = solvedBy === "reader"
        ? `Working backward took ${solverTryCount} tries.`
        : `Working backward took the computer ${solverTryCount} tries.`;
      readout.innerHTML = `
        <span class="readout-lead">${who}: ${lastTry.hopCount} hops from P lands on ${Curves.formatGridPoint(target)}.</span>
        <span class="readout-detail">${backwardNote}</span>`;
    } else {
      const forwardNote = lastTry && lastTry.triedBy === "reader"
        ? `Your ${lastTry.hopCount} hops landed on ${Curves.formatGridPoint(lastTry.landing)}, `
          + `worked out in just ${lastTry.steps} doublings and additions.`
        : "P is the ringed dot at (0, 1).";
      readout.innerHTML = `
        <span class="readout-lead">How many hops from P reach</span>
        <span class="readout-coords readout-target">${Curves.formatGridPoint(target)}</span>
        <span class="readout-detail">${forwardNote}</span>`;
    }

    triesCount.textContent = String(tries.length);
    tryList.replaceChildren(...tries.map(({ hopCount, landing }) => {
      const item = document.createElement("li");
      if (Curves.pointKey(landing) === Curves.pointKey(target)) item.className = "try-hit";
      item.textContent = `${hopCount} → ${Curves.formatGridPoint(landing)}`;
      return item;
    }));

    const busy = computerTimerId !== null;
    guessInput.disabled = Boolean(solvedBy) || busy;
    guessButton.disabled = Boolean(solvedBy) || busy;
    computerButton.disabled = Boolean(solvedBy) || busy;
  }

  guessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const hopCount = Number.parseInt(guessInput.value, 10);
    if (Number.isNaN(hopCount) || hopCount < 1 || hopCount > MAX_GUESS) {
      guessInput.setCustomValidity(`Enter a whole number from 1 to ${MAX_GUESS}.`);
      guessInput.reportValidity();
      return;
    }
    guessInput.setCustomValidity("");
    const { point, steps } = Curves.multiplyGridPoint(START_POINT, hopCount, HUNT_PRIME);
    recordTry(hopCount, point, steps, "reader");
    guessInput.value = "";
    render();
    if (!puzzle.solvedBy) guessInput.focus();
  });
  guessInput.addEventListener("input", () => guessInput.setCustomValidity(""));

  /** Hop 1, 2, 3, ...: each try is one more addition of P to the previous landing. */
  computerButton.addEventListener("click", () => {
    let hopCount = 0;
    let landing = null;
    function tryNext() {
      hopCount += 1;
      landing = Curves.addGridPoints(landing, START_POINT, HUNT_PRIME);
      recordTry(hopCount, landing, hopCount - 1, "computer");
    }
    if (Trapdoor.prefersReducedMotion()) {
      while (!puzzle.solvedBy) tryNext();
      render();
      return;
    }
    computerTimerId = setInterval(() => {
      tryNext();
      if (puzzle.solvedBy) {
        clearInterval(computerTimerId);
        computerTimerId = null;
      }
      render();
    }, COMPUTER_TRY_INTERVAL_MS);
    render();
  });
  newPuzzleButton.addEventListener("click", startNewPuzzle);

  startNewPuzzle();
})();
