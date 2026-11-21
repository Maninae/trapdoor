/*
 * The same key exchange on a 39-digit clock: fresh 30-digit secrets on every tap, and both
 * sides still land on the same 39-digit hour.
 *
 * Expects #big-exchange with .big-exchange-rows (a <dl>), .big-exchange-verdict, and
 * [data-action="new-secrets"].
 *
 * - Clock 2^127 - 1 (a Mersenne prime) and start number 3, the same big clock as chapter 3.
 * - Secrets come from crypto.getRandomValues; nothing is sent anywhere.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const BIG_CLOCK_HOURS = (1n << 127n) - 1n;
  const START_NUMBER = 3n;
  const SECRET_DIGITS = 30;

  const demo = document.getElementById("big-exchange");
  const rows = demo.querySelector(".big-exchange-rows");
  const verdict = demo.querySelector(".big-exchange-verdict");
  const newSecretsButton = demo.querySelector('[data-action="new-secrets"]');

  /** A random integer with exactly `digitCount` digits (leading digit 1..9). */
  function randomBigIntWithDigits(digitCount) {
    const randomBytes = new Uint8Array(digitCount);
    crypto.getRandomValues(randomBytes);
    const digits = Array.from(randomBytes, (byte, index) => (index === 0 ? 1 + (byte % 9) : byte % 10));
    return BigInt(digits.join(""));
  }

  function row(tagHtml, label, value, extraClass = "") {
    return `<dt>${tagHtml}${label}</dt><dd class="${extraClass}">${Trapdoor.formatNumber(value)}</dd>`;
  }

  function runExchange() {
    const aliceSecret = randomBigIntWithDigits(SECRET_DIGITS);
    const bobSecret = randomBigIntWithDigits(SECRET_DIGITS);
    const startTime = performance.now();
    const aliceAnnounces = Trapdoor.powerOnClock(START_NUMBER, aliceSecret, BIG_CLOCK_HOURS);
    const bobAnnounces = Trapdoor.powerOnClock(START_NUMBER, bobSecret, BIG_CLOCK_HOURS);
    const aliceShared = Trapdoor.powerOnClock(bobAnnounces, aliceSecret, BIG_CLOCK_HOURS);
    const bobShared = Trapdoor.powerOnClock(aliceAnnounces, bobSecret, BIG_CLOCK_HOURS);
    const elapsedMs = performance.now() - startTime;

    const aliceTag = '<span class="tag tag-alice">private</span>';
    const bobTag = '<span class="tag tag-bob">private</span>';
    const publicTag = '<span class="tag tag-public">public</span>';
    rows.innerHTML = [
      row(aliceTag, "Alice's power", aliceSecret),
      row(bobTag, "Bob's power", bobSecret),
      row(publicTag, "Alice announces", aliceAnnounces),
      row(publicTag, "Bob announces", bobAnnounces),
      row(aliceTag, "Alice lands on", aliceShared, "big-shared"),
      row(bobTag, "Bob lands on", bobShared, "big-shared"),
    ].join("");
    const match = aliceShared === bobShared;
    verdict.textContent = match
      ? `Same hour on both sides. All four powers took ${elapsedMs < 1 ? "under 1" : elapsedMs.toFixed(1)} ms.`
      : "The two sides disagree. That should never happen.";
    demo.dataset.match = String(match);
  }

  newSecretsButton.addEventListener("click", runExchange);
  runExchange();
})();
