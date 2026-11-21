/*
 * Toy mixing cipher: tap one of 36 input bits and watch that single change spread,
 * round by round, until about half the output bits differ.
 *
 * Expects #mix-widget containing .mix-input-grid, .mix-output-grid, .mix-round-bars,
 * .widget-controls, and .readout.
 *
 * - "Changed" always compares against the input as it was just before the last tap,
 *   so each tap is a clean one-bit experiment.
 * - The cipher itself lives in scrambling-helpers.js (toyRoundStates).
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { TOY_BIT_COUNT, TOY_MAX_ROUNDS, toyRoundStates, countDifferentBits } = Trapdoor.scrambling;
  const DEFAULT_ROUNDS = 6;
  const FIRST_FLIPPED_BIT = 14;
  // A fixed starting pattern so the first view is the same for everyone.
  const STARTING_INPUT_BITS = Array.from("101100101110010011010001101011100100", Number);

  const widget = document.getElementById("mix-widget");
  const inputGrid = widget.querySelector(".mix-input-grid");
  const outputGrid = widget.querySelector(".mix-output-grid");
  const outputLabel = widget.querySelector(".mix-output-label");
  const roundBars = widget.querySelector(".mix-round-bars");
  const controls = widget.querySelector(".widget-controls");
  const readout = widget.querySelector(".readout");

  let previousInputBits = STARTING_INPUT_BITS.slice();
  let currentInputBits = STARTING_INPUT_BITS.slice();
  currentInputBits[FIRST_FLIPPED_BIT] ^= 1;
  let lastFlippedBit = FIRST_FLIPPED_BIT;

  const inputCells = [];
  for (let bitIndex = 0; bitIndex < TOY_BIT_COUNT; bitIndex += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "mix-input-cell";
    cell.addEventListener("click", () => {
      previousInputBits = currentInputBits.slice();
      currentInputBits[bitIndex] ^= 1;
      lastFlippedBit = bitIndex;
      render();
    });
    inputGrid.appendChild(cell);
    inputCells.push(cell);
  }

  const outputCells = [];
  for (let bitIndex = 0; bitIndex < TOY_BIT_COUNT; bitIndex += 1) {
    const cell = document.createElement("span");
    cell.className = "mix-output-cell";
    outputGrid.appendChild(cell);
    outputCells.push(cell);
  }

  function renderRoundBars(changedCounts, shownRound) {
    roundBars.replaceChildren();
    changedCounts.forEach((changedCount, round) => {
      const item = document.createElement("li");
      item.className = round === shownRound ? "mix-round mix-round-shown" : "mix-round";
      const bar = document.createElement("span");
      bar.className = "mix-round-bar";
      bar.style.height = `${(100 * changedCount) / TOY_BIT_COUNT}%`;
      const count = document.createElement("span");
      count.className = "mix-round-count";
      count.textContent = String(changedCount);
      const label = document.createElement("span");
      label.className = "mix-round-label";
      label.textContent = round === 0 ? "in" : String(round);
      const barTrack = document.createElement("span");
      barTrack.className = "mix-round-track";
      barTrack.appendChild(bar);
      item.append(count, barTrack, label);
      item.setAttribute("aria-label", `After ${round} rounds: ${changedCount} bits changed`);
      roundBars.appendChild(item);
    });
  }

  function render() {
    const shownRound = roundStepper.getValue();
    const previousStates = toyRoundStates(previousInputBits);
    const currentStates = toyRoundStates(currentInputBits);
    const changedCounts = currentStates.map((state, round) => countDifferentBits(state, previousStates[round]));

    inputCells.forEach((cell, bitIndex) => {
      const bit = currentInputBits[bitIndex];
      cell.textContent = String(bit);
      cell.classList.toggle("bit-one", bit === 1);
      cell.classList.toggle("mix-flipped", bitIndex === lastFlippedBit);
      cell.setAttribute("aria-label", `Input bit ${bitIndex + 1} is ${bit}. Tap to flip.`);
    });

    const shownState = currentStates[shownRound];
    const shownPrevious = previousStates[shownRound];
    outputCells.forEach((cell, bitIndex) => {
      cell.textContent = String(shownState[bitIndex]);
      cell.classList.toggle("bit-one", shownState[bitIndex] === 1);
      cell.classList.toggle("mix-changed", shownState[bitIndex] !== shownPrevious[bitIndex]);
    });
    outputLabel.textContent = shownRound === 0 ? "Before any mixing" : `After ${shownRound} round${shownRound === 1 ? "" : "s"}`;
    outputGrid.setAttribute("aria-label",
      `Output after ${shownRound} rounds. ${changedCounts[shownRound]} of ${TOY_BIT_COUNT} bits changed.`);

    renderRoundBars(changedCounts, shownRound);

    const changedCount = changedCounts[shownRound];
    readout.innerHTML = `
      <span class="readout-lead">You flipped 1 bit. Output bits changed:</span>
      <span class="readout-big">${changedCount} <span class="readout-of">of ${TOY_BIT_COUNT}</span></span>
      <span class="readout-detail"></span>`;
    const nearHalf = Math.abs(changedCount - TOY_BIT_COUNT / 2) <= TOY_BIT_COUNT / 6;
    let detailText = "Add rounds and watch the change spread.";
    if (shownRound >= 3 && nearHalf) detailText = "About half, scattered with no pattern. That is the goal.";
    else if (shownRound >= 3) detailText = "Add a round or flip another bit. On average it settles near half.";
    readout.querySelector(".readout-detail").textContent = detailText;
  }

  const roundStepper = Trapdoor.createStepper({
    container: controls, label: "Rounds of mixing", min: 0, max: TOY_MAX_ROUNDS,
    value: DEFAULT_ROUNDS, onChange: render,
  });

  render();
})();
