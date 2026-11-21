/*
 * Shared pieces for the "Secret codes" chapter: letter shifting, the mystery message,
 * English letter frequencies, and a tiny SVG element builder.
 *
 * - Load after core.js and before the widget-secret-codes-*.js files.
 * - Everything hangs off window.Trapdoor.secretCodes so the widgets share one copy.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const ALPHABET_LENGTH = ALPHABET.length;

  // Plain text of the mystery message; the page only ever shows it scrambled until cracked.
  const MYSTERY_PLAINTEXT =
    "MEET ME BEHIND THE OLD LIBRARY AT THREE. BRING THE MAP AND THE SILVER KEY. " +
    "TELL NO ONE, NOT EVEN YOUR BEST FRIEND. WE LEAVE TONIGHT BEFORE THE STREET LIGHTS COME ON.";
  const MYSTERY_SHIFT = 11;

  // Percent of letters in typical English text (Lewand, via Wikipedia "Letter frequency").
  const ENGLISH_LETTER_PERCENT = {
    A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0,
    J: 0.16, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9, Q: 0.12, R: 6.0,
    S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074,
  };

  /**
   * Move every letter `shift` places forward in the alphabet, wrapping Z back to A.
   *
   * - Uppercases first; spaces and punctuation pass through untouched.
   * - A negative shift moves backward, which is how a message is unscrambled.
   */
  function shiftText(text, shift) {
    const normalizedShift = ((shift % ALPHABET_LENGTH) + ALPHABET_LENGTH) % ALPHABET_LENGTH;
    return Array.from(text.toUpperCase(), (character) => {
      const letterIndex = ALPHABET.indexOf(character);
      if (letterIndex === -1) return character;
      return ALPHABET[(letterIndex + normalizedShift) % ALPHABET_LENGTH];
    }).join("");
  }

  /** Percent of the letters in `text` that are each of A..Z (non-letters ignored). */
  function letterPercents(text) {
    const counts = Object.fromEntries(Array.from(ALPHABET, (letter) => [letter, 0]));
    let letterTotal = 0;
    for (const character of text.toUpperCase()) {
      if (counts[character] === undefined) continue;
      counts[character] += 1;
      letterTotal += 1;
    }
    const percents = {};
    for (const letter of ALPHABET) percents[letter] = letterTotal ? (100 * counts[letter]) / letterTotal : 0;
    return percents;
  }

  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  Trapdoor.secretCodes = {
    ALPHABET,
    ENGLISH_LETTER_PERCENT,
    MYSTERY_SHIFT,
    mysteryCiphertext: shiftText(MYSTERY_PLAINTEXT, MYSTERY_SHIFT),
    shiftText,
    letterPercents,
    createSvgElement,
  };
})();
