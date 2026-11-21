/*
 * Toy RSA with Bob's keys from the primes 61 and 53: Alice locks a number with the public
 * key (power 17 on a 3233-hour clock) and Bob opens it with his private key (power 2753).
 *
 * Expects #rsa-widget with svg.padlock, .widget-controls (stepper goes here), .rsa-steps,
 * .readout, and buttons [data-action="lock" | "open" | "reset"].
 *
 * - Exact BigInt math via Trapdoor.powerOnClock; 17 * 2753 = 15 * 3120 + 1 with
 *   3120 = (61 - 1) * (53 - 1), which is why opening undoes locking for every message.
 * - The padlock is drawn here; CSS slides the shackle (and snaps under reduced motion).
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const CLOCK_HOURS = 3233n;
  const LOCK_POWER = 17n;
  const UNLOCK_POWER = 2753n;
  const DEFAULT_MESSAGE = 65;
  const MIN_MESSAGE = 2;
  const MAX_MESSAGE = 3232;
  const STAGE = { WRITTEN: 0, LOCKED: 1, OPENED: 2 };

  const widget = document.getElementById("rsa-widget");
  const padlockSvg = widget.querySelector(".padlock");
  const controls = widget.querySelector(".widget-controls");
  const stepList = widget.querySelector(".rsa-steps");
  const readout = widget.querySelector(".readout");
  const lockButton = widget.querySelector('[data-action="lock"]');
  const openButton = widget.querySelector('[data-action="open"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  let stage = STAGE.WRITTEN;

  function svgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  /** Draw the padlock once; the left shackle leg is long so it stays in the body when raised. */
  function drawPadlock() {
    padlockSvg.setAttribute("viewBox", "0 -12 200 232");
    const shackle = svgElement("path", { class: "padlock-shackle", d: "M62 150 V72 a38 38 0 0 1 76 0 V112" });
    const body = svgElement("rect", { class: "padlock-body", x: 26, y: 104, width: 148, height: 112, rx: 14 });
    const value = svgElement("text", {
      class: "padlock-value", x: 100, y: 146, "text-anchor": "middle", "dominant-baseline": "central",
    });
    const keyhole = svgElement("path", { class: "padlock-keyhole", d: "M100 184 a6 6 0 1 1 -0.01 0 Z M97 189 h6 l2 13 h-10 Z" });
    padlockSvg.append(shackle, body, value, keyhole);
    return value;
  }

  const padlockValue = drawPadlock();

  function powerHtml(base, exponent) {
    return `${Trapdoor.formatNumber(base)}<sup>${Trapdoor.formatNumber(exponent)}</sup>`;
  }

  function stepItem(personClass, whoHtml, bodyHtml, tagHtml) {
    return `<li class="step-${personClass}"><span class="step-who">${whoHtml}</span><span>${bodyHtml}</span>${tagHtml}</li>`;
  }

  /** Digits in base^exponent written out in full, without any wrapping. */
  function unwrappedDigitCount(base, exponent) {
    return Math.floor(Number(exponent) * Math.log10(Number(base))) + 1;
  }

  function render() {
    const message = BigInt(messageStepper.getValue());
    const locked = Trapdoor.powerOnClock(message, LOCK_POWER, CLOCK_HOURS);
    const opened = Trapdoor.powerOnClock(locked, UNLOCK_POWER, CLOCK_HOURS);
    const lockedTwice = Trapdoor.powerOnClock(locked, LOCK_POWER, CLOCK_HOURS);
    const format = Trapdoor.formatNumber;

    const steps = [stepItem("alice", '<span class="name-alice">Alice</span> writes', `the number <strong>${format(message)}</strong>`, "")];
    if (stage >= STAGE.LOCKED) {
      steps.push(stepItem("alice", '<span class="name-alice">Alice</span> locks',
        `${powerHtml(message, LOCK_POWER)} lands on <strong>${format(locked)}</strong>`,
        '<span class="tag tag-public">public key</span>'));
      steps.push(stepItem("eve", '<span class="name-eve">Eve</span> sees',
        `${format(locked)}. Locking it again: ${powerHtml(locked, LOCK_POWER)} lands on ${format(lockedTwice)}, not the message.`, ""));
    }
    if (stage >= STAGE.OPENED) {
      steps.push(stepItem("bob", '<span class="name-bob">Bob</span> opens',
        `${powerHtml(locked, UNLOCK_POWER)} lands on <strong class="step-shared">${format(opened)}</strong>`,
        '<span class="tag tag-bob">private key</span>'));
    }
    stepList.innerHTML = steps.join("");

    const shown = { [STAGE.WRITTEN]: message, [STAGE.LOCKED]: locked, [STAGE.OPENED]: opened }[stage];
    padlockValue.textContent = format(shown);
    padlockSvg.classList.toggle("is-locked", stage === STAGE.LOCKED);
    padlockSvg.setAttribute("aria-label", stage === STAGE.LOCKED
      ? `A closed padlock holding ${format(locked)}` : `An open padlock holding ${format(shown)}`);

    if (stage === STAGE.WRITTEN) {
      readout.innerHTML = `<span class="readout-lead">Alice's message</span><span class="readout-big">${format(message)}</span>
        <span class="readout-detail">Anyone may lock it with Bob's public key.</span>`;
    } else if (stage === STAGE.LOCKED) {
      readout.innerHTML = `<span class="readout-lead">Locked</span><span class="readout-big readout-locked">${format(locked)}</span>
        <span class="readout-detail">Only Bob's private key opens this.</span>`;
    } else {
      const roundTrip = opened === message;
      readout.innerHTML = `<span class="readout-lead">Bob reads</span><span class="readout-big">${format(opened)}</span>
        <span class="readout-detail">${roundTrip ? "The same number Alice wrote." : "Not the same number. That should never happen."}
        Written out without wrapping, ${powerHtml(locked, UNLOCK_POWER)} would have ${format(unwrappedDigitCount(locked, UNLOCK_POWER))} digits.</span>`;
    }

    lockButton.disabled = stage !== STAGE.WRITTEN;
    openButton.disabled = stage !== STAGE.LOCKED;
    // Whichever step comes next wears the primary blue.
    lockButton.classList.toggle("button-primary", stage === STAGE.WRITTEN);
    openButton.classList.toggle("button-primary", stage === STAGE.LOCKED);
    widget.dataset.stage = String(stage);
    widget.dataset.message = message.toString();
    widget.dataset.locked = locked.toString();
    widget.dataset.opened = opened.toString();
  }

  const messageStepper = Trapdoor.createStepper({
    container: controls, label: "Alice's message", min: MIN_MESSAGE, max: MAX_MESSAGE,
    value: DEFAULT_MESSAGE, withSlider: true,
    onChange: () => {
      stage = STAGE.WRITTEN;
      render();
    },
  });

  lockButton.addEventListener("click", () => {
    stage = STAGE.LOCKED;
    render();
    openButton.focus();
  });
  openButton.addEventListener("click", () => {
    stage = STAGE.OPENED;
    render();
    resetButton.focus();
  });
  resetButton.addEventListener("click", () => {
    stage = STAGE.WRITTEN;
    render();
  });

  render();
})();
