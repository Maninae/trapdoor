/*
 * Opening widget: Bob signs a message with his private power; anyone checks it with the
 * public power. Change one letter of what arrived and the check fails.
 *
 * Expects #sign-widget containing .bob-input, .bob-fingerprint, .bob-signature, .sign-status,
 * .arrived-input, .arrived-fingerprint, .opened-signature, .verdict, and buttons
 * [data-action="sign" | "tamper" | "restore"].
 *
 * - Signing copies Bob's message into "arrived", as if it were sent with the signature.
 * - Fingerprints are async (SHA-256); a counter drops results overtaken by a newer edit.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { fingerprintOnClock, signFingerprint, openSignature, changeOneLetter, hasSubtleCrypto } = Trapdoor.signatures;
  const DEFAULT_MESSAGE = "Pay Alice 5 dollars";

  const widget = document.getElementById("sign-widget");
  const bobInput = widget.querySelector(".bob-input");
  const bobFingerprint = widget.querySelector(".bob-fingerprint");
  const bobSignature = widget.querySelector(".bob-signature");
  const signStatus = widget.querySelector(".sign-status");
  const arrivedInput = widget.querySelector(".arrived-input");
  const arrivedFingerprint = widget.querySelector(".arrived-fingerprint");
  const openedSignature = widget.querySelector(".opened-signature");
  const verdict = widget.querySelector(".verdict");
  const signButton = widget.querySelector('[data-action="sign"]');
  const tamperButton = widget.querySelector('[data-action="tamper"]');
  const restoreButton = widget.querySelector('[data-action="restore"]');

  let signedMessage = null;
  let signature = null;
  let bobRequestNumber = 0;
  let checkRequestNumber = 0;

  async function updateBobSide() {
    bobRequestNumber += 1;
    const requestNumber = bobRequestNumber;
    const fingerprint = await fingerprintOnClock(bobInput.value);
    if (requestNumber !== bobRequestNumber) return;
    bobFingerprint.textContent = String(fingerprint);
    bobSignature.textContent = signature === null ? "not signed yet" : String(signature);
    const stale = signedMessage !== null && bobInput.value !== signedMessage;
    bobSignature.classList.toggle("sign-number-stale", stale);
    signStatus.textContent = stale
      ? "Bob changed his message after signing. The old signature belongs to the old message. Sign again to send this one."
      : "Signed and sent.";
  }

  async function updateCheckSide() {
    checkRequestNumber += 1;
    const requestNumber = checkRequestNumber;
    if (signature === null) return;
    const fingerprint = await fingerprintOnClock(arrivedInput.value);
    if (requestNumber !== checkRequestNumber) return;
    const opened = openSignature(signature);
    const matches = opened === fingerprint;

    arrivedFingerprint.textContent = String(fingerprint);
    openedSignature.textContent = String(opened);
    arrivedFingerprint.classList.toggle("sign-number-bad", !matches);
    const tampered = arrivedInput.value !== signedMessage;

    verdict.replaceChildren();
    const big = document.createElement("span");
    big.className = matches ? "readout-big verdict-ok" : "readout-big verdict-bad";
    big.textContent = matches ? "Checks out" : "Rejected";
    const detail = document.createElement("span");
    detail.className = "readout-detail";
    if (matches && !tampered) {
      detail.textContent = `Signature to the power 17 lands on ${opened}, the same as the fingerprint. Only Bob's private key could do that.`;
    } else if (matches) {
      detail.textContent = `The message changed, yet the numbers match: a 1 in 3233 fluke of this tiny toy. Real fingerprints make that hopeless.`;
    } else {
      detail.textContent = `Signature to the power 17 lands on ${opened}, but the fingerprint is ${fingerprint}. Someone changed the message.`;
    }
    verdict.append(big, detail);
    restoreButton.disabled = !tampered;
  }

  async function signAndSend() {
    const messageToSign = bobInput.value;
    const fingerprint = await fingerprintOnClock(messageToSign);
    signature = signFingerprint(fingerprint);
    signedMessage = messageToSign;
    arrivedInput.value = messageToSign;
    await Promise.all([updateBobSide(), updateCheckSide()]);
  }

  if (!hasSubtleCrypto()) {
    verdict.textContent = "This browser only offers SHA-256 on a secure (https) page. Open the site online to try it.";
    [bobInput, arrivedInput, signButton, tamperButton, restoreButton].forEach((element) => { element.disabled = true; });
    return;
  }

  signButton.addEventListener("click", signAndSend);
  bobInput.addEventListener("input", updateBobSide);
  arrivedInput.addEventListener("input", updateCheckSide);
  tamperButton.addEventListener("click", () => {
    arrivedInput.value = changeOneLetter(signedMessage === null ? arrivedInput.value : signedMessage);
    updateCheckSide();
  });
  restoreButton.addEventListener("click", () => {
    arrivedInput.value = signedMessage;
    updateCheckSide();
  });

  bobInput.value = DEFAULT_MESSAGE;
  signAndSend();
})();
