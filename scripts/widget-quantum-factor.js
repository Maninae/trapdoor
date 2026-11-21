/*
 * From period to factors: pick a clock size N and a base, and every step of the arithmetic
 * is written out, ending in N = p × q or in an honest "unlucky, try another base".
 *
 * Expects #factor-widget containing .prime-buttons (data-clock), .widget-controls (the base
 * stepper is built here), buttons with data-preset="N,base", .readout, and ol.factor-steps.
 *
 * - Why it works: h = base^(r/2) makes h^2 - 1 = (h - 1)(h + 1) land on 0, so N divides
 *   the product; when h is not N - 1, neither factor alone is a multiple of N, so each gcd
 *   catches part of N.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Quantum = Trapdoor.Quantum;

  const widget = document.getElementById("factor-widget");
  const clockButtons = widget.querySelectorAll(".prime-buttons button");
  const controls = widget.querySelector(".widget-controls");
  const presetButtons = widget.querySelectorAll("[data-preset]");
  const readout = widget.querySelector(".readout");
  const stepsList = widget.querySelector(".factor-steps");

  let clockSize = 15;

  function euclidLines(gcdRecord) {
    return gcdRecord.steps
      .map(({ dividend, divisor, quotient, remainder }) => `${dividend} = ${quotient} × ${divisor} + ${remainder}`)
      .join("; ");
  }

  function powersText(plan, base) {
    const listed = plan.powers.map((value, exponent) => `${base}<sup>${exponent}</sup> → ${value}`).join(", ");
    return `Powers of ${base}: ${listed}. Back to 1 after ${plan.period} steps, so the period is ${plan.period}.`;
  }

  function stepsFor(plan, base) {
    const N = clockSize;
    const shared = plan.sharedGcd.result;
    const sharedNote = shared === 1 ? "no shortcut, so look for the period" : `a factor of ${N} for free`;
    const steps = [`Greatest common divisor of ${base} and ${N}: ${euclidLines(plan.sharedGcd)}. `
      + `It is ${shared}: ${sharedNote}.`];
    if (plan.kind === "shared-factor") return steps;
    steps.push(powersText(plan, base));
    if (plan.kind === "odd-period") {
      steps.push(`${plan.period} is odd, so there is no half-way power to use.`);
      return steps;
    }
    const half = plan.period / 2;
    steps.push(`Half the period is ${half}: ${base}<sup>${half}</sup> lands on <b>${plan.halfPower}</b>. Call it <i>h</i>.`);
    if (plan.kind === "minus-one") {
      steps.push(`${plan.halfPower} is ${N} − 1, so <i>h</i> + 1 is ${N} itself and the next step finds only 1 and ${N}.`);
      return steps;
    }
    const minus = plan.halfPower - 1;
    const plus = plan.halfPower + 1;
    steps.push(`<i>h</i> × <i>h</i> lands on 1, so (<i>h</i> − 1)(<i>h</i> + 1) lands on 0: `
      + `${minus} × ${plus} = ${plan.product} = ${plan.product / N} × ${N}.`);
    steps.push(`Greatest common divisor of ${minus} and ${N}: ${euclidLines(plan.minusGcd)}. It is <b>${plan.minusGcd.result}</b>.`);
    steps.push(`Greatest common divisor of ${plus} and ${N}: ${euclidLines(plan.plusGcd)}. It is <b>${plan.plusGcd.result}</b>.`);
    return steps;
  }

  function render() {
    const base = baseStepper.getValue();
    const plan = Quantum.planFactorWalk(base, clockSize);
    stepsList.replaceChildren(...stepsFor(plan, base).map((html) => {
      const item = document.createElement("li");
      item.innerHTML = html;
      return item;
    }));
    if (plan.kind === "success") {
      readout.innerHTML = `
        <span class="readout-lead">The period splits ${clockSize}:</span>
        <span class="readout-big">${clockSize} = ${plan.minusGcd.result} × ${plan.plusGcd.result}</span>`;
    } else if (plan.kind === "shared-factor") {
      readout.innerHTML = `
        <span class="readout-lead">Lucky: ${base} already shares a factor.</span>
        <span class="readout-big">${clockSize} = ${plan.factor} × ${plan.other}</span>`;
    } else {
      const reason = plan.kind === "odd-period" ? "the period is odd" : `the half power lands on ${clockSize} − 1`;
      readout.innerHTML = `
        <span class="readout-lead">Unlucky: ${reason}.</span>
        <span class="readout-unlucky">Try another number.</span>`;
    }
  }

  function createBaseStepper(startValue) {
    controls.replaceChildren();
    return Trapdoor.createStepper({
      container: controls, label: "Number to raise to powers", min: 2, max: clockSize - 1,
      value: startValue, onChange: render,
    });
  }

  function selectClock(newClockSize, newBase) {
    clockSize = newClockSize;
    clockButtons.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.clock) === clockSize)));
    baseStepper = createBaseStepper(Math.min(newBase, clockSize - 1));
    render();
  }

  let baseStepper = createBaseStepper(7);

  clockButtons.forEach((button) => {
    button.addEventListener("click", () => selectClock(Number(button.dataset.clock), baseStepper.getValue()));
  });
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const [presetClock, presetBase] = button.dataset.preset.split(",").map(Number);
      selectClock(presetClock, presetBase);
    });
  });

  render();
})();
