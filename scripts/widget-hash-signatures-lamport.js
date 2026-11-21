/*
 * Lamport one-time signature at toy size: a 6-bit message, 6 pairs of random 32-byte secrets,
 * and their real SHA-256 fingerprints as the public key. Signing reveals one secret per bit;
 * checking re-fingerprints each revealed secret in the browser and compares all 32 bytes.
 * Signing a second message with the same key leaks both secrets wherever the messages differ,
 * and "Forge" then builds a valid signature for a message nobody signed.
 *
 * Expects #lamport-widget with .key-grid, .readout, and buttons
 * [data-action="sign" | "check" | "forge" | "new"].
 *
 * - Every check is real: crypto.subtle.digest("SHA-256") over the revealed bytes.
 * - Only the first HEX_SHOWN hex digits are drawn; comparisons use the full digest.
 */
(function () {
  "use strict";

  const BIT_COUNT = 6;
  const SECRET_BYTES = 32;
  const HEX_SHOWN = 4;

  const widget = document.getElementById("lamport-widget");
  const keyGrid = widget.querySelector(".key-grid");
  const readout = widget.querySelector(".readout");
  const signButton = widget.querySelector('[data-action="sign"]');
  const checkButton = widget.querySelector('[data-action="check"]');
  const forgeButton = widget.querySelector('[data-action="forge"]');
  const newButton = widget.querySelector('[data-action="new"]');

  let key = null;          // { secrets[bit][pos], fingerprints[bit][pos] } as Uint8Arrays
  let messageBits = [1, 0, 1, 1, 0, 0];
  let signedMessages = []; // bit arrays signed by the real key holder
  let revealed = [];       // revealed[pos] = Set of bits whose secret is public
  let activeSignature = null; // { bits, secrets[pos], forged }
  let checkResults = null; // per-position true / false after a check
  let status = { lead: "", detail: "" };

  const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const bitsText = (bits) => bits.join("");
  const sameBits = (bitsP, bitsQ) => bitsP.every((bit, index) => bit === bitsQ[index]);

  async function fingerprint(bytes) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  }

  function bytesEqual(bytesP, bytesQ) {
    return bytesP.length === bytesQ.length && bytesP.every((byte, index) => byte === bytesQ[index]);
  }

  async function makeKey() {
    const secrets = [0, 1].map(() => Array.from({ length: BIT_COUNT }, () => crypto.getRandomValues(new Uint8Array(SECRET_BYTES))));
    const fingerprints = await Promise.all(secrets.map((row) => Promise.all(row.map(fingerprint))));
    return { secrets, fingerprints };
  }

  function leakedPositions() {
    return revealed.map((bits, pos) => (bits.size === 2 ? pos : -1)).filter((pos) => pos >= 0);
  }

  function buildGrid() {
    keyGrid.replaceChildren();
    const corner = document.createElement("span");
    corner.className = "key-row-label";
    corner.textContent = "Bit";
    keyGrid.appendChild(corner);
    for (let pos = 0; pos < BIT_COUNT; pos += 1) {
      const bitButton = document.createElement("button");
      bitButton.type = "button";
      bitButton.className = "bit-toggle";
      bitButton.dataset.pos = String(pos);
      bitButton.addEventListener("click", () => {
        messageBits[pos] = 1 - messageBits[pos];
        checkResults = null;
        if (activeSignature) {
          status = { lead: "Message changed after signing.", detail: "Check the old signature against it." };
        }
        render();
      });
      keyGrid.appendChild(bitButton);
    }
    [0, 1].forEach((bit) => {
      const label = document.createElement("span");
      label.className = "key-row-label";
      label.textContent = `If ${bit}`;
      keyGrid.appendChild(label);
      for (let pos = 0; pos < BIT_COUNT; pos += 1) {
        const cell = document.createElement("div");
        cell.className = "key-cell";
        cell.dataset.bit = String(bit);
        cell.dataset.pos = String(pos);
        cell.innerHTML = '<span class="key-fingerprint"></span><span class="key-secret"></span><span class="key-check"></span>';
        keyGrid.appendChild(cell);
      }
    });
  }

  function render() {
    keyGrid.querySelectorAll(".bit-toggle").forEach((button) => {
      const pos = Number(button.dataset.pos);
      button.textContent = String(messageBits[pos]);
      button.setAttribute("aria-label", `Bit ${pos + 1}: ${messageBits[pos]}. Tap to flip.`);
    });
    const leaked = new Set(leakedPositions());
    keyGrid.querySelectorAll(".key-cell").forEach((cell) => {
      const bit = Number(cell.dataset.bit);
      const pos = Number(cell.dataset.pos);
      const isRevealed = revealed[pos].has(bit);
      const isChosen = messageBits[pos] === bit;
      cell.classList.toggle("is-chosen", isChosen);
      cell.classList.toggle("is-revealed", isRevealed);
      cell.classList.toggle("is-leaked", leaked.has(pos));
      cell.querySelector(".key-fingerprint").textContent = toHex(key.fingerprints[bit][pos]).slice(0, HEX_SHOWN);
      cell.querySelector(".key-secret").textContent = isRevealed ? toHex(key.secrets[bit][pos]).slice(0, HEX_SHOWN) : "";
      const checkMark = cell.querySelector(".key-check");
      if (checkResults && isChosen) {
        checkMark.textContent = checkResults[pos] ? "✓" : "✗";
        checkMark.className = `key-check ${checkResults[pos] ? "check-ok" : "check-bad"}`;
      } else {
        checkMark.textContent = "";
        checkMark.className = "key-check";
      }
    });
    readout.innerHTML = `<span class="readout-lead"></span><span class="readout-detail"></span>`;
    readout.querySelector(".readout-lead").textContent = status.lead;
    readout.querySelector(".readout-detail").textContent = status.detail;
    checkButton.disabled = !activeSignature;
    forgeButton.disabled = leakedPositions().length < 2;
  }

  function signCurrentMessage() {
    const bits = messageBits.slice();
    bits.forEach((bit, pos) => revealed[pos].add(bit));
    activeSignature = { bits, secrets: bits.map((bit, pos) => key.secrets[bit][pos]), forged: false };
    const isNew = !signedMessages.some((signed) => sameBits(signed, bits));
    if (isNew) signedMessages.push(bits);
    checkResults = null;
    const leakedCount = leakedPositions().length;
    if (signedMessages.length === 1) {
      status = { lead: `Signed ${bitsText(bits)}.`, detail: "One secret from each column is now public, in blue. Check it." };
    } else if (leakedCount < 2) {
      status = {
        lead: `Signed ${bitsText(bits)} with the same key.`,
        detail: `${leakedCount} column now has both secrets public. Flip two or more bits and sign again to see real trouble.`,
      };
    } else {
      status = {
        lead: `Second message, same key: ${leakedCount} columns leaked.`,
        detail: `Both secrets are public in the red columns, so anyone can now sign ${2 ** leakedCount} messages.`,
      };
    }
    render();
  }

  async function checkSignature() {
    const results = await Promise.all(messageBits.map(async (bit, pos) => {
      const digest = await fingerprint(activeSignature.secrets[pos]);
      return bytesEqual(digest, key.fingerprints[bit][pos]);
    }));
    checkResults = results;
    const passes = results.every(Boolean);
    const who = activeSignature.forged ? "the forged signature" : "the signature";
    status = passes
      ? { lead: `Valid: ${who} checks out for ${bitsText(messageBits)}.`, detail: "Each revealed secret, run through SHA-256, matches the published fingerprint." }
      : { lead: `Rejected: ${who} does not fit ${bitsText(messageBits)}.`, detail: "A revealed secret fingerprints to the wrong cell." };
    render();
  }

  function forgeMessage() {
    const candidates = [];
    for (let value = 0; value < 2 ** BIT_COUNT; value += 1) {
      const bits = Array.from({ length: BIT_COUNT }, (_, pos) => (value >> (BIT_COUNT - 1 - pos)) & 1);
      const coverable = bits.every((bit, pos) => revealed[pos].has(bit));
      if (coverable && !signedMessages.some((signed) => sameBits(signed, bits))) candidates.push(bits);
    }
    if (candidates.length === 0) return;
    const bits = candidates[Math.floor(Math.random() * candidates.length)];
    messageBits = bits.slice();
    activeSignature = { bits, secrets: bits.map((bit, pos) => key.secrets[bit][pos]), forged: true };
    checkResults = null;
    status = { lead: `Forged a signature for ${bitsText(bits)}.`, detail: "Nobody signed this message. Built only from public secrets. Check it." };
    render();
    checkSignature();
  }

  async function startFresh() {
    key = await makeKey();
    signedMessages = [];
    revealed = Array.from({ length: BIT_COUNT }, () => new Set());
    activeSignature = null;
    checkResults = null;
    status = { lead: "Flip the bits, then sign.", detail: "The public key is the 12 fingerprints. The secrets behind them stay hidden." };
    render();
  }

  signButton.addEventListener("click", signCurrentMessage);
  checkButton.addEventListener("click", checkSignature);
  forgeButton.addEventListener("click", forgeMessage);
  newButton.addEventListener("click", startFresh);

  buildGrid();
  startFresh();
})();
