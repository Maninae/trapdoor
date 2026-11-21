/*
 * "Small errors" demo (learning with errors at toy size): five clock equations in two secret
 * numbers x, y on a 13-hour clock. With noise on, each answer is nudged by -1, 0 or +1.
 * The reader guesses (x, y) and sees each equation's leftover; elimination on the first two
 * equations recovers the secret without noise and fails with it.
 *
 * Expects #lattice-noise-widget with .equation-list, .readout, .widget-controls, and buttons
 * [data-noise="off" | "on"], [data-action="eliminate" | "new"].
 *
 * - Puzzles are drawn so exactly one guess leaves only small leftovers, and so the noise
 *   actually breaks elimination (the first two equations carry nonzero noise).
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const CLOCK_HOURS = 13;
  const EQUATION_COUNT = 5;
  const MAX_SMALL_LEFTOVER = 1;
  const MAX_PUZZLE_ATTEMPTS = 2000;

  const widget = document.getElementById("lattice-noise-widget");
  const equationList = widget.querySelector(".equation-list");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");
  const noiseButtons = Array.from(widget.querySelectorAll("[data-noise]"));
  const eliminateButton = widget.querySelector('[data-action="eliminate"]');
  const newButton = widget.querySelector('[data-action="new"]');

  const wrap = (value) => Number(Trapdoor.wrap(value, CLOCK_HOURS));
  const randomHour = (min) => min + Math.floor(Math.random() * (CLOCK_HOURS - min));
  /** Show a clock value as the nearest signed number, so 12 reads as -1. */
  const signed = (value) => (value > CLOCK_HOURS / 2 ? value - CLOCK_HOURS : value);

  let noiseOn = true;
  let puzzle = null;
  let guess = { x: 0, y: 0 };
  let note = "";

  function leftovers(equations, guessX, guessY) {
    return equations.map(({ coefX, coefY, answer }) => signed(wrap(answer - coefX * guessX - coefY * guessY)));
  }

  function countFittingGuesses(equations) {
    let fitting = 0;
    for (let guessX = 0; guessX < CLOCK_HOURS; guessX += 1) {
      for (let guessY = 0; guessY < CLOCK_HOURS; guessY += 1) {
        if (leftovers(equations, guessX, guessY).every((left) => Math.abs(left) <= MAX_SMALL_LEFTOVER)) fitting += 1;
      }
    }
    return fitting;
  }

  function makePuzzle() {
    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt += 1) {
      const secret = { x: randomHour(0), y: randomHour(0) };
      const rows = Array.from({ length: EQUATION_COUNT }, () => ({ coefX: randomHour(1), coefY: randomHour(1) }));
      if (wrap(rows[0].coefX * rows[1].coefY - rows[0].coefY * rows[1].coefX) === 0) continue;
      const noise = rows.map((_, index) => (index < 2 ? (Math.random() < 0.5 ? -1 : 1) : randomHour(0) % 3 - 1));
      const build = (withNoise) => rows.map((row, index) => ({
        ...row,
        answer: wrap(row.coefX * secret.x + row.coefY * secret.y + (withNoise ? noise[index] : 0)),
      }));
      const noisy = build(true);
      if (countFittingGuesses(noisy) !== 1) continue;
      const eliminated = solveFirstTwo(noisy);
      if (eliminated.x === secret.x && eliminated.y === secret.y) continue;
      return { secret, clean: build(false), noisy };
    }
    throw new Error("could not draw a noise puzzle");
  }

  /** Exact elimination on equations 1 and 2, treating the clock answers as if noise-free. */
  function solveFirstTwo(equations) {
    const [first, second] = equations;
    const determinant = wrap(first.coefX * second.coefY - first.coefY * second.coefX);
    const inverse = Number(Trapdoor.powerOnClock(determinant, CLOCK_HOURS - 2, CLOCK_HOURS));
    return {
      x: wrap(inverse * (first.answer * second.coefY - first.coefY * second.answer)),
      y: wrap(inverse * (first.coefX * second.answer - first.answer * second.coefX)),
    };
  }

  const stepperX = Trapdoor.createStepper({
    container: controls, label: "Guess for x", min: 0, max: CLOCK_HOURS - 1, value: 0,
    onChange(value) { guess.x = value; note = ""; render(); },
  });
  const stepperY = Trapdoor.createStepper({
    container: controls, label: "Guess for y", min: 0, max: CLOCK_HOURS - 1, value: 0,
    onChange(value) { guess.y = value; note = ""; render(); },
  });

  function currentEquations() {
    return noiseOn ? puzzle.noisy : puzzle.clean;
  }

  function render() {
    const equations = currentEquations();
    const left = leftovers(equations, guess.x, guess.y);
    equationList.replaceChildren();
    equations.forEach(({ coefX, coefY, answer }, index) => {
      const item = document.createElement("li");
      const small = Math.abs(left[index]) <= MAX_SMALL_LEFTOVER;
      item.className = small ? "leftover-small" : "";
      item.innerHTML = `<span class="equation-text">${coefX}x + ${coefY}y &rarr; ${answer}</span>
        <span class="equation-leftover">off by ${left[index] < 0 ? "&minus;" : ""}${Math.abs(left[index])}</span>`;
      equationList.appendChild(item);
    });

    const exact = left.every((value) => value === 0);
    const allSmall = left.every((value) => Math.abs(value) <= MAX_SMALL_LEFTOVER);
    let lead;
    if (exact) lead = "Every equation fits exactly.";
    else if (noiseOn && allSmall) lead = "Every leftover is tiny. That is the secret.";
    else lead = `${left.filter((value) => Math.abs(value) <= MAX_SMALL_LEFTOVER).length} of ${EQUATION_COUNT} equations come close.`;
    readout.innerHTML = `
      <span class="readout-lead">${lead}</span>
      <span class="readout-detail">${note || `Your guess: x = ${guess.x}, y = ${guess.y}, on a 13-hour clock.`}</span>`;
    noiseButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String((button.dataset.noise === "on") === noiseOn));
    });
  }

  function setGuess(nextGuess) {
    guess = { ...nextGuess };
    stepperX.setValue(guess.x);
    stepperY.setValue(guess.y);
  }

  noiseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      noiseOn = button.dataset.noise === "on";
      note = "";
      render();
    });
  });

  eliminateButton.addEventListener("click", () => {
    const solved = solveFirstTwo(currentEquations());
    setGuess(solved);
    note = noiseOn
      ? `Elimination on the first two says x = ${solved.x}, y = ${solved.y}. The noise threw it off.`
      : `Elimination on the first two says x = ${solved.x}, y = ${solved.y}.`;
    render();
  });

  newButton.addEventListener("click", () => {
    puzzle = makePuzzle();
    setGuess({ x: 0, y: 0 });
    note = "";
    render();
  });

  puzzle = makePuzzle();
  render();
})();
