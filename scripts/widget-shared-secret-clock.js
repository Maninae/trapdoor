/*
 * Key exchange on a 23-hour clock: Alice and Bob each pick a secret power, announce where
 * the start number lands, then raise the other's announcement to their own secret power.
 *
 * Expects #exchange-widget with .dial, .secret-alice and .secret-bob boxes (steppers are
 * appended into them), .exchange-steps (ordered list), .readout, and [data-action="random"].
 *
 * - Clock 23 with start number 5, the textbook example (5 reaches every hour 1..22), so the
 *   default secrets 4 and 3 reproduce the standard answer: announcements 4 and 10, shared 18.
 * - Secrets run 1..21; power 22 would send every announcement to 1.
 * - All arithmetic is Trapdoor.powerOnClock (BigInt), the same forward step as chapter 3.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const CLOCK_HOURS = 23;
  const START_NUMBER = 5;
  const MIN_SECRET = 1;
  const MAX_SECRET = CLOCK_HOURS - 2;
  const DEFAULT_ALICE_SECRET = 4;
  const DEFAULT_BOB_SECRET = 3;

  const widget = document.getElementById("exchange-widget");
  const dialSvg = widget.querySelector(".dial");
  const stepList = widget.querySelector(".exchange-steps");
  const readout = widget.querySelector(".readout");
  const randomButton = widget.querySelector('[data-action="random"]');

  /** Recolor one hour's dot and label after renderDial has drawn it (labels hold the hour as text). */
  function tintDialHour(svg, hour, personClass) {
    const label = Array.from(svg.querySelectorAll("text")).find((text) => text.textContent === String(hour));
    if (!label) return;
    label.classList.add(`dial-label-${personClass}`);
    const dot = label.previousElementSibling;
    if (dot) dot.classList.add(`dial-mark-${personClass}`);
  }

  function powerHtml(base, exponent) {
    return `${base}<sup>${exponent}</sup>`;
  }

  function stepItem(personClass, who, tagHtml, expressionHtml, resultHtml) {
    return `<li class="step-${personClass}">
      <span class="step-who">${who}</span>
      <span>${expressionHtml} lands on <span class="step-result">${resultHtml}</span></span>
      ${tagHtml}</li>`;
  }

  function render() {
    const aliceSecret = aliceStepper.getValue();
    const bobSecret = bobStepper.getValue();
    const aliceAnnounces = Number(Trapdoor.powerOnClock(START_NUMBER, aliceSecret, CLOCK_HOURS));
    const bobAnnounces = Number(Trapdoor.powerOnClock(START_NUMBER, bobSecret, CLOCK_HOURS));
    const aliceShared = Number(Trapdoor.powerOnClock(bobAnnounces, aliceSecret, CLOCK_HOURS));
    const bobShared = Number(Trapdoor.powerOnClock(aliceAnnounces, bobSecret, CLOCK_HOURS));
    const productExponent = aliceSecret * bobSecret;
    const directShared = Number(Trapdoor.powerOnClock(START_NUMBER, productExponent, CLOCK_HOURS));

    const marks = { [START_NUMBER]: "start", [aliceAnnounces]: "visited", [bobAnnounces]: "visited" };
    marks[aliceShared] = "landed";
    Trapdoor.renderDial(dialSvg, { hours: CLOCK_HOURS, marks });
    if (marks[aliceAnnounces] === "visited" && aliceAnnounces !== bobAnnounces) tintDialHour(dialSvg, aliceAnnounces, "alice");
    if (marks[bobAnnounces] === "visited" && aliceAnnounces !== bobAnnounces) tintDialHour(dialSvg, bobAnnounces, "bob");
    dialSvg.setAttribute("aria-label",
      `A ${CLOCK_HOURS}-hour clock. Alice announces ${aliceAnnounces}, Bob announces ${bobAnnounces}, and both land on ${aliceShared}.`);

    const publicTag = '<span class="tag tag-public">said out loud</span>';
    stepList.innerHTML = [
      stepItem("alice", '<span class="name-alice">Alice</span> announces', publicTag,
        powerHtml(START_NUMBER, `<span class="name-alice">${aliceSecret}</span>`), aliceAnnounces),
      stepItem("bob", '<span class="name-bob">Bob</span> announces', publicTag,
        powerHtml(START_NUMBER, `<span class="name-bob">${bobSecret}</span>`), bobAnnounces),
      stepItem("alice", '<span class="name-alice">Alice</span>, at home', '<span class="tag tag-alice">private</span>',
        powerHtml(bobAnnounces, `<span class="name-alice">${aliceSecret}</span>`), `<span class="step-shared">${aliceShared}</span>`),
      stepItem("bob", '<span class="name-bob">Bob</span>, at home', '<span class="tag tag-bob">private</span>',
        powerHtml(aliceAnnounces, `<span class="name-bob">${bobSecret}</span>`), `<span class="step-shared">${bobShared}</span>`),
    ].join("");

    readout.innerHTML = `
      <span class="readout-lead">Both land on</span>
      <span class="readout-big">${aliceShared}</span>
      <span class="readout-detail">Both computed ${powerHtml(START_NUMBER, `${aliceSecret} × ${bobSecret}`)} = ${powerHtml(START_NUMBER, productExponent)}, which lands on ${directShared}.
        <span class="name-eve">Eve</span> heard 23, 5, ${aliceAnnounces}, and ${bobAnnounces}, but neither secret power.</span>`;

    widget.dataset.aliceShared = String(aliceShared);
    widget.dataset.bobShared = String(bobShared);
  }

  const aliceStepper = Trapdoor.createStepper({
    container: widget.querySelector(".secret-alice"), label: "Alice's secret power",
    min: MIN_SECRET, max: MAX_SECRET, value: DEFAULT_ALICE_SECRET, onChange: render,
  });
  const bobStepper = Trapdoor.createStepper({
    container: widget.querySelector(".secret-bob"), label: "Bob's secret power",
    min: MIN_SECRET, max: MAX_SECRET, value: DEFAULT_BOB_SECRET, onChange: render,
  });

  function randomSecret() {
    return MIN_SECRET + Math.floor(Math.random() * (MAX_SECRET - MIN_SECRET + 1));
  }

  randomButton.addEventListener("click", () => {
    aliceStepper.setValue(randomSecret());
    bobStepper.setValue(randomSecret());
    render();
  });

  render();
})();
