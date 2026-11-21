/*
 * Opening widget: your letters as bits, a random key of the same length, and the XOR of
 * the two. "Unscramble" XORs the key in again and the message comes back.
 *
 * Expects #xor-widget containing input.message-input, .bit-blocks, .readout, and buttons
 * [data-action="new-key" | "unscramble"].
 *
 * - One block per byte: rows for message, key, scrambled, and (when unscrambling) the
 *   recovered message. Cells are display only; the buttons are the controls.
 * - The key is drawn fresh from crypto.getRandomValues and is as long as the message.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { bytesFromText, bitsOfByte, randomBytes, hexOfByte } = Trapdoor.scrambling;
  const MAX_MESSAGE_BYTES = 6;
  const DEFAULT_MESSAGE = "SECRET";

  const widget = document.getElementById("xor-widget");
  const messageInput = widget.querySelector(".message-input");
  const bitBlocks = widget.querySelector(".bit-blocks");
  const readout = widget.querySelector(".readout");
  const newKeyButton = widget.querySelector('[data-action="new-key"]');
  const unscrambleButton = widget.querySelector('[data-action="unscramble"]');

  let keyBytes = randomBytes(MAX_MESSAGE_BYTES);
  let showUnscrambled = false;

  function bitRow(bits, rowKind, rowLabel) {
    const row = document.createElement("div");
    row.className = `bit-row bit-row-${rowKind}`;
    row.setAttribute("aria-label", `${rowLabel}: ${bits.join("")}`);
    bits.forEach((bit) => {
      const cell = document.createElement("span");
      cell.className = bit ? "bit-cell bit-one" : "bit-cell";
      cell.textContent = String(bit);
      cell.setAttribute("aria-hidden", "true");
      row.appendChild(cell);
    });
    return row;
  }

  /** Show a byte as its character when it is plain printable ASCII, else as a dot. */
  function printableCharacter(byteValue) {
    return byteValue >= 33 && byteValue <= 126 ? String.fromCharCode(byteValue) : "·";
  }

  function render() {
    const messageBytes = bytesFromText(messageInput.value, MAX_MESSAGE_BYTES);
    const scrambledBytes = messageBytes.map((byteValue, index) => byteValue ^ keyBytes[index]);
    const recoveredBytes = scrambledBytes.map((byteValue, index) => byteValue ^ keyBytes[index]);

    bitBlocks.replaceChildren();
    messageBytes.forEach((byteValue, index) => {
      const block = document.createElement("div");
      block.className = "bit-block";
      const heading = document.createElement("span");
      heading.className = "bit-block-char";
      heading.textContent = printableCharacter(byteValue) === "·" ? "␣" : printableCharacter(byteValue);
      block.appendChild(heading);
      block.appendChild(bitRow(bitsOfByte(byteValue), "message", "Message"));
      block.appendChild(bitRow(bitsOfByte(keyBytes[index]), "key", "Key"));
      block.appendChild(bitRow(bitsOfByte(scrambledBytes[index]), "out", "Scrambled"));
      if (showUnscrambled) block.appendChild(bitRow(bitsOfByte(recoveredBytes[index]), "back", "Scrambled XOR key"));
      bitBlocks.appendChild(block);
    });
    bitBlocks.classList.toggle("bit-blocks-unscrambled", showUnscrambled);

    readout.replaceChildren();
    const lead = document.createElement("span");
    lead.className = "readout-lead";
    const big = document.createElement("span");
    big.className = "readout-code";
    const detail = document.createElement("span");
    detail.className = "readout-detail";
    if (messageBytes.length === 0) {
      lead.textContent = "Type a message.";
    } else if (showUnscrambled) {
      lead.textContent = "XOR the same key in again:";
      big.textContent = new TextDecoder().decode(new Uint8Array(recoveredBytes));
      big.classList.add("readout-code-ok");
      detail.textContent = "Every 1 in the key flips that bit twice, so it lands back where it started.";
    } else {
      lead.textContent = "Scrambled, as bytes:";
      big.textContent = scrambledBytes.map(hexOfByte).join(" ");
      detail.textContent = `As letters: ${scrambledBytes.map(printableCharacter).join("")}. A new key gives a different scramble.`;
    }
    readout.append(lead, big, detail);
    unscrambleButton.setAttribute("aria-pressed", String(showUnscrambled));
    unscrambleButton.textContent = showUnscrambled ? "Hide it" : "Unscramble";
  }

  newKeyButton.addEventListener("click", () => {
    keyBytes = randomBytes(MAX_MESSAGE_BYTES);
    render();
  });
  unscrambleButton.addEventListener("click", () => {
    showUnscrambled = !showUnscrambled;
    render();
  });
  messageInput.addEventListener("input", render);

  messageInput.value = DEFAULT_MESSAGE;
  messageInput.maxLength = MAX_MESSAGE_BYTES;
  render();
})();
