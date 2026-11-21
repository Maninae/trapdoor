/*
 * Shared pieces for the "Signatures" chapter: Bob's toy RSA keys from chapter 5,
 * a SHA-256 fingerprint shrunk onto his 3233-hour clock, signing, checking, and tampering.
 *
 * - Load after core.js (uses Trapdoor.powerOnClock) and before widget-signatures-*.js.
 * - Keys match chapter 5 (two-keys.html): primes 61 and 53, clock 3233, public power 17,
 *   private power 2753, because 17 x 2753 = 15 x 3120 + 1.
 * - The fingerprint is a real SHA-256 digest taken mod 3233, so only 3233 fingerprints exist.
 *   A tampered message matches by luck about 1 time in 3233; the page says so.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const CLOCK_HOURS = 3233n;
  const PUBLIC_POWER = 17n;
  const PRIVATE_POWER = 2753n;

  /** SHA-256 of the UTF-8 text, read as one big number, wrapped onto the 3233-hour clock. */
  async function fingerprintOnClock(text) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    let digestNumber = 0n;
    for (const byteValue of digest) digestNumber = (digestNumber << 8n) | BigInt(byteValue);
    return digestNumber % CLOCK_HOURS;
  }

  /** Bob's signature: the fingerprint raised to his private power, wrapped. */
  function signFingerprint(fingerprint) {
    return Trapdoor.powerOnClock(fingerprint, PRIVATE_POWER, CLOCK_HOURS);
  }

  /** What anyone can compute: the signature raised to the public power, wrapped. */
  function openSignature(signature) {
    return Trapdoor.powerOnClock(signature, PUBLIC_POWER, CLOCK_HOURS);
  }

  /**
   * Change one randomly chosen letter of `text` to a different letter, keeping its case.
   * Returns the text unchanged when it has no letters.
   */
  function changeOneLetter(text) {
    const letterPositions = [];
    Array.from(text).forEach((character, index) => { if (/[A-Za-z]/.test(character)) letterPositions.push(index); });
    if (letterPositions.length === 0) return text;
    const characters = Array.from(text);
    const position = letterPositions[Math.floor(Math.random() * letterPositions.length)];
    const original = characters[position];
    const isUpper = original === original.toUpperCase();
    const originalOffset = original.toLowerCase().charCodeAt(0) - 97;
    const newOffset = (originalOffset + 1 + Math.floor(Math.random() * 25)) % 26;
    const replacement = String.fromCharCode(97 + newOffset);
    characters[position] = isUpper ? replacement.toUpperCase() : replacement;
    return characters.join("");
  }

  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  Trapdoor.signatures = {
    CLOCK_HOURS,
    PUBLIC_POWER,
    PRIVATE_POWER,
    fingerprintOnClock,
    signFingerprint,
    openSignature,
    changeOneLetter,
    createSvgElement,
    hasSubtleCrypto: () => Boolean(window.crypto && window.crypto.subtle),
  };
})();
