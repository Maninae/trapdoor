/*
 * Shared pieces for "The blender" chapter: text to bits, random keys, the toy mixing
 * cipher, and SHA-256 through the browser's built-in crypto.
 *
 * - Load after core.js and before the widget-scrambling-*.js files.
 * - Everything hangs off window.Trapdoor.scrambling.
 * - The toy cipher is made up for this page. It borrows AES's shape (add key, substitute,
 *   shuffle bits, repeat) at a size you can see, and is not secure.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});
  const BITS_PER_BYTE = 8;

  /** UTF-8 bytes of `text`, cut to at most `maxBytes`. */
  function bytesFromText(text, maxBytes) {
    return Array.from(new TextEncoder().encode(text)).slice(0, maxBytes);
  }

  /** The 8 bits of a byte, most significant first (so 65 is 0,1,0,0,0,0,0,1). */
  function bitsOfByte(byteValue) {
    const bits = [];
    for (let position = BITS_PER_BYTE - 1; position >= 0; position -= 1) bits.push((byteValue >> position) & 1);
    return bits;
  }

  function randomBytes(count) {
    return Array.from(crypto.getRandomValues(new Uint8Array(count)));
  }

  function hexOfByte(byteValue) {
    return byteValue.toString(16).toUpperCase().padStart(2, "0");
  }

  function countDifferentBits(firstBits, secondBits) {
    return firstBits.reduce((total, bit, index) => total + (bit !== secondBits[index] ? 1 : 0), 0);
  }

  // ---------- toy mixing cipher: 36 bits as 9 groups of 4 ----------

  const TOY_BIT_COUNT = 36;
  const TOY_MAX_ROUNDS = 8;
  // A well-studied 4-bit substitution table (from the PRESENT cipher): every input bit
  // affects several output bits, which is what makes the change spread.
  const TOY_SUBSTITUTION_TABLE = [0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2];
  // Bit i moves to (i * 7) mod 36; 7 shares no factor with 36, so this is a true shuffle
  // and it sends the 4 bits of a group to 4 different groups.
  const TOY_SHUFFLE_MULTIPLIER = 7;
  const TOY_KEY_SEED = 20261120;

  /** Fixed pseudo-random round keys, so the page behaves the same on every visit. */
  function buildToyRoundKeys() {
    const roundKeys = [];
    let generatorState = TOY_KEY_SEED;
    for (let round = 0; round < TOY_MAX_ROUNDS; round += 1) {
      const roundKey = [];
      for (let bitIndex = 0; bitIndex < TOY_BIT_COUNT; bitIndex += 1) {
        generatorState = (Math.imul(generatorState, 1103515245) + 12345) >>> 0;
        roundKey.push((generatorState >>> 16) & 1);
      }
      roundKeys.push(roundKey);
    }
    return roundKeys;
  }

  const TOY_ROUND_KEYS = buildToyRoundKeys();

  /** One round: mix in the round key, substitute each 4-bit group, then shuffle the bits. */
  function toyRound(stateBits, roundIndex) {
    const keyed = stateBits.map((bit, index) => bit ^ TOY_ROUND_KEYS[roundIndex][index]);
    const substituted = new Array(TOY_BIT_COUNT);
    for (let groupStart = 0; groupStart < TOY_BIT_COUNT; groupStart += 4) {
      let groupValue = 0;
      for (let offset = 0; offset < 4; offset += 1) groupValue |= keyed[groupStart + offset] << offset;
      const replacement = TOY_SUBSTITUTION_TABLE[groupValue];
      for (let offset = 0; offset < 4; offset += 1) substituted[groupStart + offset] = (replacement >> offset) & 1;
    }
    const shuffled = new Array(TOY_BIT_COUNT);
    substituted.forEach((bit, index) => { shuffled[(index * TOY_SHUFFLE_MULTIPLIER) % TOY_BIT_COUNT] = bit; });
    return shuffled;
  }

  /** The state after 0, 1, ..., TOY_MAX_ROUNDS rounds; entry 0 is the input itself. */
  function toyRoundStates(inputBits) {
    const states = [inputBits.slice()];
    for (let round = 0; round < TOY_MAX_ROUNDS; round += 1) states.push(toyRound(states[round], round));
    return states;
  }

  // ---------- SHA-256 ----------

  /** SHA-256 of the UTF-8 text as an array of 32 bytes. Needs a secure page (https or localhost). */
  async function sha256Bytes(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest));
  }

  function hasSubtleCrypto() {
    return Boolean(window.crypto && window.crypto.subtle);
  }

  Trapdoor.scrambling = {
    bytesFromText,
    bitsOfByte,
    randomBytes,
    hexOfByte,
    countDifferentBits,
    TOY_BIT_COUNT,
    TOY_MAX_ROUNDS,
    toyRoundStates,
    sha256Bytes,
    hasSubtleCrypto,
  };
})();
