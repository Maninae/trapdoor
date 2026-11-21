/*
 * Opening widget: a two-ring cipher wheel. Turn the inner ring to pick a shift and watch
 * your own message scramble.
 *
 * Expects #wheel-widget containing svg.cipher-wheel, input.message-input, .widget-controls,
 * and .readout.
 *
 * - The outer ring is the plain alphabet; the inner ring is the same alphabet turned by
 *   the shift, so each outer letter sits over the letter it becomes.
 * - The inner ring turns with a CSS transition, which base.css removes under
 *   prefers-reduced-motion.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const { ALPHABET, shiftText, createSvgElement } = Trapdoor.secretCodes;

  const VIEWBOX_SIZE = 400;
  const CENTER = VIEWBOX_SIZE / 2;
  const OUTER_EDGE_RADIUS = 196;
  const RING_BOUNDARY_RADIUS = 150;
  const INNER_EDGE_RADIUS = 104;
  const OUTER_LETTER_RADIUS = 173;
  const INNER_LETTER_RADIUS = 127;
  const LETTER_FONT_SIZE = 21;
  const DEGREES_PER_LETTER = 360 / ALPHABET.length;
  const DEFAULT_SHIFT = 3;
  const DEFAULT_MESSAGE = "MEET ME AT NOON";

  const widget = document.getElementById("wheel-widget");
  const wheelSvg = widget.querySelector(".cipher-wheel");
  const messageInput = widget.querySelector(".message-input");
  const controls = widget.querySelector(".widget-controls");
  const readout = widget.querySelector(".readout");

  /** Position of letter slot `slotIndex` at `radius`, slot 0 at the top, running clockwise. */
  function pointForSlot(slotIndex, radius) {
    const radians = ((slotIndex * DEGREES_PER_LETTER - 90) * Math.PI) / 180;
    return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
  }

  /** One ring of 26 letters, each turned so its top faces outward like a real wheel. */
  function drawLetterRing(group, radius, className) {
    const letterElements = [];
    Array.from(ALPHABET).forEach((letter, slotIndex) => {
      const [x, y] = pointForSlot(slotIndex, radius);
      const text = createSvgElement("text", {
        x, y, "font-size": LETTER_FONT_SIZE, "text-anchor": "middle", "dominant-baseline": "central",
        transform: `rotate(${slotIndex * DEGREES_PER_LETTER} ${x} ${y})`, class: className,
      });
      text.textContent = letter;
      group.appendChild(text);
      letterElements.push(text);
    });
    return letterElements;
  }

  function drawWheel() {
    wheelSvg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);
    // The window at the top frames the pair being read: plain letter over its code letter.
    const halfWindow = (DEGREES_PER_LETTER / 2) * (Math.PI / 180);
    const windowCorners = [OUTER_EDGE_RADIUS, INNER_EDGE_RADIUS].map((radius) => [
      [CENTER - radius * Math.sin(halfWindow), CENTER - radius * Math.cos(halfWindow)],
      [CENTER + radius * Math.sin(halfWindow), CENTER - radius * Math.cos(halfWindow)],
    ]);
    const [[outerLeft, outerRight], [innerLeft, innerRight]] = windowCorners;
    wheelSvg.appendChild(createSvgElement("path", {
      d: `M${outerLeft[0]} ${outerLeft[1]} A${OUTER_EDGE_RADIUS} ${OUTER_EDGE_RADIUS} 0 0 1 ${outerRight[0]} ${outerRight[1]}
          L${innerRight[0]} ${innerRight[1]} A${INNER_EDGE_RADIUS} ${INNER_EDGE_RADIUS} 0 0 0 ${innerLeft[0]} ${innerLeft[1]} Z`,
      class: "wheel-window",
    }));
    [OUTER_EDGE_RADIUS, RING_BOUNDARY_RADIUS, INNER_EDGE_RADIUS].forEach((radius) => {
      wheelSvg.appendChild(createSvgElement("circle", { cx: CENTER, cy: CENTER, r: radius, class: "wheel-ring" }));
    });
    const outerGroup = createSvgElement("g", {});
    const innerGroup = createSvgElement("g", { class: "wheel-inner" });
    wheelSvg.append(outerGroup, innerGroup);
    const outerLetters = drawLetterRing(outerGroup, OUTER_LETTER_RADIUS, "wheel-letter-plain");
    const innerLetters = drawLetterRing(innerGroup, INNER_LETTER_RADIUS, "wheel-letter-code");
    const centerLabel = createSvgElement("text", {
      x: CENTER, y: CENTER, "font-size": 44, "text-anchor": "middle", "dominant-baseline": "central",
      class: "wheel-center-number",
    });
    wheelSvg.appendChild(centerLabel);
    return { outerLetters, innerLetters, innerGroup, centerLabel };
  }

  const wheel = drawWheel();
  // Track the turn without wrapping, so the ring takes the short way instead of spinning back.
  let shownShift = DEFAULT_SHIFT;

  function update(shift) {
    const turnDelta = ((shift - (shownShift % 26)) % 26 + 39) % 26 - 13;
    shownShift += turnDelta;
    wheel.innerGroup.style.transform = `rotate(${-shownShift * DEGREES_PER_LETTER}deg)`;
    wheel.centerLabel.textContent = String(shift);

    const message = messageInput.value;
    const messageLetters = new Set(message.toUpperCase());
    wheel.outerLetters.forEach((element, slotIndex) => {
      element.classList.toggle("wheel-letter-used", messageLetters.has(ALPHABET[slotIndex]));
    });
    wheel.innerLetters.forEach((element, slotIndex) => {
      const plainLetter = ALPHABET[(slotIndex - shift + 26) % 26];
      element.classList.toggle("wheel-letter-used", messageLetters.has(plainLetter));
    });

    const scrambled = shiftText(message, shift);
    wheelSvg.setAttribute("aria-label", `Cipher wheel turned ${shift} places. A becomes ${ALPHABET[shift]}.`);
    readout.replaceChildren();
    const lead = document.createElement("span");
    lead.className = "readout-lead";
    lead.textContent = "Scrambled:";
    const big = document.createElement("span");
    big.className = "readout-code";
    big.textContent = scrambled.trim() === "" ? "Type a message" : scrambled;
    const detail = document.createElement("span");
    detail.className = "readout-detail";
    detail.textContent =
      `A becomes ${ALPHABET[shift]}, B becomes ${ALPHABET[(shift + 1) % 26]}, and Z wraps around to ${ALPHABET[(shift + 25) % 26]}. ` +
      `To read it, shift back ${shift}.`;
    readout.append(lead, big, detail);
  }

  const shiftStepper = Trapdoor.createStepper({
    container: controls, label: "Turn the inner ring", min: 1, max: 25,
    value: DEFAULT_SHIFT, withSlider: true,
    onChange: (shift) => update(shift),
  });

  messageInput.value = DEFAULT_MESSAGE;
  messageInput.addEventListener("input", () => update(shiftStepper.getValue()));
  update(DEFAULT_SHIFT);
})();
