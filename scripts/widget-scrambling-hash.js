/*
 * Real fingerprint demo: type text, see its SHA-256 hash (computed by the browser's own
 * crypto.subtle), with the hex digits that changed since the last edit marked.
 *
 * Expects #hash-widget containing input.hash-input, .hash-output, .readout, and a button
 * [data-action="nudge"].
 *
 * - Digests are async; a counter drops results that arrive after a newer edit.
 * - Without crypto.subtle (an insecure page) it says so instead of failing silently.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { sha256Bytes, hexOfByte, bitsOfByte, countDifferentBits, hasSubtleCrypto } = Trapdoor.scrambling;
  const DEFAULT_TEXT = "Meet me at noon";
  const HEX_DIGITS_PER_LINE = 16;
  const DIGEST_BITS = 256;

  const widget = document.getElementById("hash-widget");
  const textInput = widget.querySelector(".hash-input");
  const hashOutput = widget.querySelector(".hash-output");
  const readout = widget.querySelector(".readout");
  const nudgeButton = widget.querySelector('[data-action="nudge"]');

  let previousDigest = null;
  let latestRequestNumber = 0;

  function bitsOfDigest(digestBytes) {
    return digestBytes.flatMap(bitsOfByte);
  }

  function renderDigest(digestBytes) {
    const hexDigits = digestBytes.map(hexOfByte).join("");
    const previousHex = previousDigest ? previousDigest.map(hexOfByte).join("") : hexDigits;
    hashOutput.replaceChildren();
    for (let lineStart = 0; lineStart < hexDigits.length; lineStart += HEX_DIGITS_PER_LINE) {
      const line = document.createElement("span");
      line.className = "hash-line";
      for (let index = lineStart; index < lineStart + HEX_DIGITS_PER_LINE; index += 1) {
        const digit = document.createElement("span");
        digit.textContent = hexDigits[index];
        if (hexDigits[index] !== previousHex[index]) digit.className = "hash-digit-changed";
        line.appendChild(digit);
      }
      hashOutput.appendChild(line);
    }
    hashOutput.setAttribute("aria-label", `SHA-256 fingerprint: ${hexDigits}`);

    const changedBits = previousDigest ? countDifferentBits(bitsOfDigest(digestBytes), bitsOfDigest(previousDigest)) : null;
    readout.innerHTML = `
      <span class="readout-lead">Bits changed since your last edit</span>
      <span class="readout-big">${changedBits === null ? "0" : changedBits} <span class="readout-of">of ${DIGEST_BITS}</span></span>
      <span class="readout-detail"></span>`;
    readout.querySelector(".readout-detail").textContent = changedBits === null
      ? "Change one letter and watch."
      : "Blue digits changed. Same text always gives the same fingerprint.";
    previousDigest = digestBytes;
  }

  async function update() {
    latestRequestNumber += 1;
    const requestNumber = latestRequestNumber;
    const digestBytes = await sha256Bytes(textInput.value);
    if (requestNumber !== latestRequestNumber) return;
    renderDigest(digestBytes);
  }

  /** Swap the last letter for the next one in the alphabet: the smallest possible edit. */
  function nudgeLastLetter() {
    const text = textInput.value;
    const match = /[A-Za-z](?=[^A-Za-z]*$)/.exec(text);
    if (!match) {
      textInput.value = `${text}a`;
    } else {
      const letter = match[0];
      const isUpper = letter === letter.toUpperCase();
      const nextCode = ((letter.toLowerCase().charCodeAt(0) - 97 + 1) % 26) + 97;
      const nextLetter = String.fromCharCode(nextCode);
      textInput.value = text.slice(0, match.index) + (isUpper ? nextLetter.toUpperCase() : nextLetter) + text.slice(match.index + 1);
    }
    update();
  }

  if (!hasSubtleCrypto()) {
    readout.textContent = "This browser only offers SHA-256 on a secure (https) page. Open the site online to try it.";
    textInput.disabled = true;
    nudgeButton.disabled = true;
    return;
  }

  textInput.value = DEFAULT_TEXT;
  textInput.addEventListener("input", update);
  nudgeButton.addEventListener("click", nudgeLastLetter);
  update();
})();
