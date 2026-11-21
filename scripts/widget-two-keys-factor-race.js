/*
 * Factoring race: the computer multiplies two random primes instantly; the reader (or the
 * computer, by plain trial division) has to split the product back apart.
 *
 * Expects #factor-widget with .prime-buttons (data-digits), .readout, .guess-form,
 * .tries-count, .try-list, .search-meter-fill, .search-status, and buttons
 * [data-action="computer" | "new"].
 *
 * - The computer's search is honest trial division (2, then 3, 5, 7, ...), run in slices of
 *   FRAME_BUDGET_MS per animation frame so the page stays responsive and the count is live.
 * - Products up to 2^53 use plain Numbers (fast); bigger ones use BigInt (slower but exact).
 * - The meter fills toward the square root of the product: the smaller prime is never past it.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { randomPrimePairForDigits, formatDuration, integerSquareRoot } = Trapdoor.twoKeys;
  const DEFAULT_DIGITS = 4;
  const FRAME_BUDGET_MS = 12;
  const DIVISIONS_PER_CHECK = 4096;
  const ESTIMATE_AFTER_MS = 1500;
  const LONG_NUMBER_DIGITS = 12;

  const widget = document.getElementById("factor-widget");
  const digitButtons = widget.querySelectorAll(".prime-buttons button");
  const readout = widget.querySelector(".readout");
  const guessForm = widget.querySelector(".guess-form");
  const guessInput = guessForm.querySelector("input");
  const guessButton = guessForm.querySelector("button");
  const triesCount = widget.querySelector(".tries-count");
  const tryList = widget.querySelector(".try-list");
  const meter = widget.querySelector(".search-meter");
  const meterFill = widget.querySelector(".search-meter-fill");
  const searchStatus = widget.querySelector(".search-status");
  const computerButton = widget.querySelector('[data-action="computer"]');
  const newButton = widget.querySelector('[data-action="new"]');

  let digits = DEFAULT_DIGITS;
  let puzzle = null;
  let search = null;

  const format = (value) => Trapdoor.formatNumber(value);

  function newPuzzle() {
    stopSearch();
    const [smallPrime, largePrime] = randomPrimePairForDigits(digits);
    const startTime = performance.now();
    const product = smallPrime * largePrime;
    const multiplyMs = performance.now() - startTime;
    puzzle = { smallPrime, largePrime, product, multiplyMs, root: integerSquareRoot(product), tries: [], solvedBy: null };
    searchStatus.textContent = "";
    meterFill.style.width = "0%";
    meter.hidden = true;
    guessInput.value = "";
    render();
  }

  function render() {
    const { product, smallPrime, largePrime, solvedBy, tries } = puzzle;
    const sizeClass = digits >= LONG_NUMBER_DIGITS ? " readout-long" : "";
    if (solvedBy) {
      const who = solvedBy === "reader" ? `You split it in ${tries.length} ${tries.length === 1 ? "try" : "tries"}` : "The computer split it";
      readout.innerHTML = `
        <span class="readout-lead">${who}:</span>
        <span class="readout-big readout-split${sizeClass}">${format(product)}</span>
        <span class="readout-factors">= ${format(smallPrime)} × ${format(largePrime)}</span>
        <span class="readout-detail">Multiplying them took the computer ${formatDuration(puzzle.multiplyMs)}.</span>`;
    } else {
      readout.innerHTML = `
        <span class="readout-lead">The computer multiplied two secret primes in ${formatDuration(puzzle.multiplyMs)}:</span>
        <span class="readout-big readout-target${sizeClass}">${format(product)}</span>
        <span class="readout-detail">Can you split it back into the two primes?</span>`;
    }
    triesCount.textContent = String(tries.length);
    tryList.replaceChildren();
    tries.forEach(({ divisor, remainder, quotient }) => {
      const item = document.createElement("li");
      if (remainder === 0n) {
        item.className = "try-hit";
        item.textContent = `÷ ${format(divisor)} = ${format(quotient)}`;
      } else {
        item.textContent = `÷ ${format(divisor)}: remainder ${format(remainder)}`;
      }
      tryList.appendChild(item);
    });
    const busy = search !== null;
    guessInput.disabled = Boolean(solvedBy) || busy;
    guessButton.disabled = Boolean(solvedBy) || busy;
    computerButton.textContent = busy ? "Stop the computer" : "Let the computer try dividing";
    computerButton.disabled = Boolean(solvedBy) && !busy;
    widget.dataset.product = product.toString();
    widget.dataset.solved = solvedBy || "";
  }

  guessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const typed = guessInput.value.replace(/[\s,]/g, "");
    const divisor = /^\d+$/.test(typed) ? BigInt(typed) : 0n;
    if (divisor < 2n || divisor >= puzzle.product) {
      guessInput.setCustomValidity(`Enter a whole number from 2 to ${format(puzzle.product - 1n)}.`);
      guessInput.reportValidity();
      return;
    }
    guessInput.setCustomValidity("");
    const remainder = puzzle.product % divisor;
    puzzle.tries.push({ divisor, remainder, quotient: puzzle.product / divisor });
    if (remainder === 0n) puzzle.solvedBy = "reader";
    guessInput.value = "";
    render();
    if (!puzzle.solvedBy) guessInput.focus();
  });
  guessInput.addEventListener("input", () => guessInput.setCustomValidity(""));

  function stopSearch() {
    if (search) cancelAnimationFrame(search.frameId);
    search = null;
  }

  /** Trial division state machine; runs one time-boxed slice per animation frame. */
  function startSearch() {
    const useNumbers = puzzle.product <= BigInt(Number.MAX_SAFE_INTEGER);
    search = {
      useNumbers,
      product: useNumbers ? Number(puzzle.product) : puzzle.product,
      divisor: useNumbers ? 2 : 2n,
      divisionCount: 0,
      startTime: performance.now(),
      frameId: null,
    };
    search.frameId = requestAnimationFrame(runSlice);
    meter.hidden = false;
    render();
  }

  function runSlice() {
    const state = search;
    if (!state) return;
    const sliceEnd = performance.now() + FRAME_BUDGET_MS;
    let found = null;
    const one = state.useNumbers ? 1 : 1n;
    const two = state.useNumbers ? 2 : 2n;
    const zero = state.useNumbers ? 0 : 0n;
    while (found === null && performance.now() < sliceEnd) {
      for (let index = 0; index < DIVISIONS_PER_CHECK; index += 1) {
        state.divisionCount += 1;
        if (state.product % state.divisor === zero) {
          found = state.divisor;
          break;
        }
        // After 2, step through odd numbers only.
        state.divisor += state.divisor === two ? one : two;
      }
    }
    const elapsedMs = performance.now() - state.startTime;
    const currentDivisor = BigInt(state.divisor);
    const fraction = Number(currentDivisor * 10000n / (puzzle.root || 1n)) / 10000;
    meterFill.style.width = `${Math.min(100, fraction * 100).toFixed(2)}%`;

    if (found !== null) {
      const divisionWord = state.divisionCount === 1 ? "division" : "divisions";
      searchStatus.textContent = `Found ${format(found)} after ${format(state.divisionCount)} ${divisionWord} in ${formatDuration(elapsedMs)}.`;
      puzzle.solvedBy = "computer";
      search = null;
      render();
      return;
    }
    let statusText = `Divisions tried: ${format(state.divisionCount)}. Time: ${formatDuration(elapsedMs)}.`;
    if (elapsedMs > ESTIMATE_AFTER_MS) {
      const divisionsPerMs = state.divisionCount / elapsedMs;
      const remainingDivisions = Number(puzzle.root - currentDivisor) / 2;
      statusText += ` Reaching the end of the bar at this speed: about ${formatDuration(remainingDivisions / divisionsPerMs)}.`;
    }
    searchStatus.textContent = statusText;
    state.frameId = requestAnimationFrame(runSlice);
  }

  computerButton.addEventListener("click", () => {
    if (search) {
      stopSearch();
      searchStatus.textContent += " Stopped.";
      render();
      return;
    }
    startSearch();
  });

  newButton.addEventListener("click", newPuzzle);

  digitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      digits = Number(button.dataset.digits);
      digitButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      newPuzzle();
    });
  });

  newPuzzle();
})();
