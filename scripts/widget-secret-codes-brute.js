/*
 * "Try every key": the reader unscrambles the mystery message by stepping through all
 * 25 shifts, then taps the line that reads as English.
 *
 * Expects #brute-widget containing .mystery-text, .readout, .shift-list (an <ol>),
 * and buttons [data-action="next" | "all" | "reset"].
 *
 * - Each tried shift becomes a full-width button, so the pick works the same by touch or keyboard.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { mysteryCiphertext, MYSTERY_SHIFT, shiftText } = Trapdoor.secretCodes;
  const KEY_COUNT = 25;

  const widget = document.getElementById("brute-widget");
  const mysteryText = widget.querySelector(".mystery-text");
  const readout = widget.querySelector(".readout");
  const shiftList = widget.querySelector(".shift-list");
  const nextButton = widget.querySelector('[data-action="next"]');
  const allButton = widget.querySelector('[data-action="all"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  let triedShiftCount = 0;
  let pickedShift = null;

  function renderReadout() {
    const cracked = pickedShift === MYSTERY_SHIFT;
    readout.innerHTML = `
      <span class="readout-lead">Keys tried</span>
      <span class="readout-big">${triedShiftCount} <span class="readout-of">of ${KEY_COUNT}</span></span>
      <span class="readout-detail"></span>`;
    const detail = readout.querySelector(".readout-detail");
    if (cracked) {
      detail.textContent = `Cracked. The key was a shift of ${MYSTERY_SHIFT}. Only 25 keys means anyone can try them all.`;
    } else if (pickedShift !== null) {
      detail.textContent = `Shift ${pickedShift} gives gibberish. Keep looking.`;
    } else if (triedShiftCount === 0) {
      detail.textContent = "Shift the message back by 1, 2, 3, and so on. Tap the line that makes sense.";
    } else {
      detail.textContent = "Tap a line if it reads as English.";
    }
  }

  function addShiftRow(shift) {
    const item = document.createElement("li");
    const rowButton = document.createElement("button");
    rowButton.type = "button";
    rowButton.className = "shift-row";
    rowButton.dataset.shift = String(shift);
    const label = document.createElement("span");
    label.className = "shift-row-label";
    label.textContent = `Back ${shift}`;
    const attempt = document.createElement("span");
    attempt.className = "shift-row-text";
    attempt.textContent = shiftText(mysteryCiphertext, -shift);
    rowButton.append(label, attempt);
    rowButton.addEventListener("click", () => pickShift(shift));
    item.appendChild(rowButton);
    shiftList.appendChild(item);
  }

  function pickShift(shift) {
    pickedShift = shift;
    shiftList.querySelectorAll(".shift-row").forEach((rowButton) => {
      const rowShift = Number(rowButton.dataset.shift);
      rowButton.classList.toggle("shift-row-picked", rowShift === shift);
      rowButton.classList.toggle("shift-row-cracked", rowShift === shift && shift === MYSTERY_SHIFT);
    });
    renderReadout();
  }

  function tryNextShift() {
    if (triedShiftCount >= KEY_COUNT) return;
    triedShiftCount += 1;
    addShiftRow(triedShiftCount);
    syncButtons();
    renderReadout();
  }

  function syncButtons() {
    nextButton.disabled = triedShiftCount >= KEY_COUNT;
    allButton.disabled = triedShiftCount >= KEY_COUNT;
  }

  nextButton.addEventListener("click", tryNextShift);
  allButton.addEventListener("click", () => {
    while (triedShiftCount < KEY_COUNT) tryNextShift();
  });
  resetButton.addEventListener("click", () => {
    triedShiftCount = 0;
    pickedShift = null;
    shiftList.replaceChildren();
    syncButtons();
    renderReadout();
  });

  mysteryText.textContent = mysteryCiphertext;
  syncButtons();
  renderReadout();
})();
