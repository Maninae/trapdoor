/*
 * "Find the exponent": the reader sees where base^? landed on a 29-hour clock and has to
 * work backward, counting tries. A second, small demo shows forward is instant even on a
 * 39-digit clock.
 *
 * Expects #challenge-widget with .dial, .readout, .guess-form (input + submit),
 * .tries-count, .try-list, buttons [data-action="computer" | "new"], and #forward-demo
 * with .forward-input and .forward-output.
 *
 * - Bases are primitive roots of 29 (their powers visit every hour 1..28), so each
 *   target has exactly one exponent in 1..28 and the puzzle always has an answer.
 * - Any exponent that lands on the target counts as a win (28 more than the answer works too).
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const CHALLENGE_PRIME = 29;
  const MAX_GUESS_EXPONENT = 999;
  const COMPUTER_TRY_INTERVAL_MS = 140;
  // A 39-digit safe prime p: (p - 1) / 2 is also prime, so p - 1 has no small factors to exploit.
  // 3 lands on (p - 1) / 2 different hours, so backward search still faces about 10^38 powers.
  const BIG_CLOCK_HOURS = 170141183460469231731687303715884114527n;
  const BIG_CLOCK_BASE = 3n;
  const MAX_FORWARD_EXPONENT_DIGITS = 40;

  const widget = document.getElementById("challenge-widget");
  const dialSvg = widget.querySelector(".dial");
  const readout = widget.querySelector(".readout");
  const guessForm = widget.querySelector(".guess-form");
  const guessInput = guessForm.querySelector("input");
  const guessButton = guessForm.querySelector("button");
  const triesCount = widget.querySelector(".tries-count");
  const tryList = widget.querySelector(".try-list");
  const computerButton = widget.querySelector('[data-action="computer"]');
  const newPuzzleButton = widget.querySelector('[data-action="new"]');

  const forwardInput = document.querySelector("#forward-demo .forward-input");
  const forwardOutput = document.querySelector("#forward-demo .forward-output");

  /** Bases whose powers reach every hour 1..p-1 (order exactly p-1). */
  function primitiveRootsOf(prime) {
    const roots = [];
    for (let candidate = 2; candidate < prime; candidate += 1) {
      let value = candidate;
      let order = 1;
      while (value !== 1) {
        value = (value * candidate) % prime;
        order += 1;
      }
      if (order === prime - 1) roots.push(candidate);
    }
    return roots;
  }

  const CHALLENGE_BASES = primitiveRootsOf(CHALLENGE_PRIME);

  function randomInteger(minInclusive, maxInclusive) {
    return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
  }

  let puzzle = null;
  let computerTimerId = null;

  function startNewPuzzle() {
    clearInterval(computerTimerId);
    computerTimerId = null;
    const base = CHALLENGE_BASES[randomInteger(0, CHALLENGE_BASES.length - 1)];
    // Skip exponent 1 (lands on the base itself, too easy to spot).
    const secretExponent = randomInteger(2, CHALLENGE_PRIME - 2);
    puzzle = {
      base,
      target: Number(Trapdoor.powerOnClock(base, secretExponent, CHALLENGE_PRIME)),
      tries: [],
      solvedBy: null,
    };
    guessInput.value = "";
    render();
  }

  function recordTry(exponent, triedBy) {
    const landing = Number(Trapdoor.powerOnClock(puzzle.base, exponent, CHALLENGE_PRIME));
    puzzle.tries.push({ exponent, landing });
    if (landing === puzzle.target) puzzle.solvedBy = triedBy;
  }

  function render() {
    const { base, target, tries, solvedBy } = puzzle;
    const marks = {};
    tries.forEach(({ landing }) => { marks[landing] = "miss"; });
    if (tries.length > 0) marks[tries[tries.length - 1].landing] = "landed";
    marks[target] = solvedBy ? "landed" : "target";
    Trapdoor.renderDial(dialSvg, { hours: CHALLENGE_PRIME, marks });
    dialSvg.setAttribute("aria-label", `A 29-hour clock with hour ${target} circled as the target.`);

    if (solvedBy) {
      const winning = tries[tries.length - 1];
      const who = solvedBy === "reader" ? "You found it" : "The computer found it";
      readout.innerHTML = `
        <span class="readout-lead">${who}: ${base}<sup>${winning.exponent}</sup> lands on ${target}.</span>
        <span class="readout-detail">Each try was one quick forward calculation. Working backward took ${tries.length} of them.</span>`;
    } else {
      readout.innerHTML = `
        <span class="readout-lead">On a 29-hour clock, ${base}<sup>?</sup> lands on</span>
        <span class="readout-big readout-target">${target}</span>
        <span class="readout-detail">Which power gets there?</span>`;
    }

    triesCount.textContent = String(tries.length);
    tryList.replaceChildren();
    tries.forEach(({ exponent, landing }) => {
      const item = document.createElement("li");
      if (landing === target) item.className = "try-hit";
      item.innerHTML = `${base}<sup>${exponent}</sup> → ${landing}`;
      tryList.appendChild(item);
    });
    tryList.scrollLeft = tryList.scrollWidth;

    const busy = computerTimerId !== null;
    guessInput.disabled = Boolean(solvedBy) || busy;
    guessButton.disabled = Boolean(solvedBy) || busy;
    computerButton.disabled = Boolean(solvedBy) || busy;
  }

  guessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const exponent = Number.parseInt(guessInput.value, 10);
    if (Number.isNaN(exponent) || exponent < 1 || exponent > MAX_GUESS_EXPONENT) {
      guessInput.setCustomValidity(`Enter a whole number from 1 to ${MAX_GUESS_EXPONENT}.`);
      guessInput.reportValidity();
      return;
    }
    guessInput.setCustomValidity("");
    recordTry(exponent, "reader");
    guessInput.value = "";
    render();
    if (!puzzle.solvedBy) guessInput.focus();
  });
  guessInput.addEventListener("input", () => guessInput.setCustomValidity(""));

  /** The only obvious backward method: try exponent 1, 2, 3, ... until one lands on the target. */
  computerButton.addEventListener("click", () => {
    let nextExponent = 1;
    const alreadyTried = new Set(puzzle.tries.map(({ exponent }) => exponent));
    function tryNext() {
      while (alreadyTried.has(nextExponent)) nextExponent += 1;
      recordTry(nextExponent, "computer");
      nextExponent += 1;
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

  function renderForwardDemo() {
    const digitsOnly = forwardInput.value.replace(/\D/g, "").slice(0, MAX_FORWARD_EXPONENT_DIGITS);
    if (digitsOnly !== forwardInput.value) forwardInput.value = digitsOnly;
    if (digitsOnly === "") {
      forwardOutput.textContent = "Type an exponent.";
      return;
    }
    const startTime = performance.now();
    const landing = Trapdoor.powerOnClock(BIG_CLOCK_BASE, BigInt(digitsOnly), BIG_CLOCK_HOURS);
    const elapsedMs = performance.now() - startTime;
    forwardOutput.innerHTML = `
      <span class="forward-landing">${Trapdoor.formatNumber(landing)}</span>
      <span class="forward-time">Found in ${elapsedMs < 1 ? "under 1" : elapsedMs.toFixed(1)} ms.</span>`;
  }
  forwardInput.addEventListener("input", renderForwardDemo);

  startNewPuzzle();
  renderForwardDemo();
})();
