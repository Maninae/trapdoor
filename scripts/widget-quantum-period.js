/*
 * Hero widget for chapter 8: powers of a number on a clock as a bar chart, plus an outlined
 * copy the reader slides right until every bar lines up. The smallest slide that works is
 * the period.
 *
 * Expects #period-widget containing svg.bar-chart, .prime-buttons (data-clock),
 * .widget-controls (two steppers are built here), and .readout.
 *
 * - A bar "lines up" when the copy's outline has the same height as the bar under it,
 *   i.e. base^x equals base^(x - shift) on the clock.
 * - A base that shares a factor with the clock never returns to 1; the readout says so.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Quantum = Trapdoor.Quantum;
  const BAR_COUNT = 24;
  const MAX_SHIFT = 12;
  const CHART_WIDTH = 600;
  const CHART_HEIGHT = 250;
  const CHART_LEFT = 14;
  const CHART_BASELINE = 214;
  const CHART_TALLEST = 196;
  const SLOT_WIDTH = (CHART_WIDTH - 2 * CHART_LEFT) / BAR_COUNT;
  const BAR_WIDTH = SLOT_WIDTH * 0.62;
  const SEQUENCE_PREVIEW_LENGTH = 12;

  const widget = document.getElementById("period-widget");
  const svg = widget.querySelector(".bar-chart");
  const clockButtons = widget.querySelectorAll(".prime-buttons button");
  const controls = widget.querySelector(".widget-controls");
  const readout = widget.querySelector(".readout");

  let clockSize = 15;

  function barHeight(value) {
    return Math.max(4, (value / (clockSize - 1)) * CHART_TALLEST);
  }

  function drawChart(powers, shift) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    svg.appendChild(Quantum.createSvgElement("line", {
      x1: CHART_LEFT, y1: CHART_BASELINE, x2: CHART_WIDTH - CHART_LEFT, y2: CHART_BASELINE, class: "bar-axis",
    }));
    powers.forEach((value, exponent) => {
      const left = CHART_LEFT + exponent * SLOT_WIDTH + (SLOT_WIDTH - BAR_WIDTH) / 2;
      const compared = exponent >= shift;
      const matches = compared && powers[exponent - shift] === value;
      const height = barHeight(value);
      svg.appendChild(Quantum.createSvgElement("rect", {
        x: left, y: CHART_BASELINE - height, width: BAR_WIDTH, height, rx: 2,
        class: matches ? "bar bar-match" : compared ? "bar" : "bar bar-unpaired",
      }));
      if (exponent + shift < BAR_COUNT) {
        const ghostLeft = left + shift * SLOT_WIDTH;
        svg.appendChild(Quantum.createSvgElement("rect", {
          x: ghostLeft - 2, y: CHART_BASELINE - height - 2, width: BAR_WIDTH + 4, height: height + 2, rx: 3,
          class: "bar-ghost",
        }));
      }
      if (exponent % 4 === 0) {
        const label = Quantum.createSvgElement("text", {
          x: left + BAR_WIDTH / 2, y: CHART_BASELINE + 30, "text-anchor": "middle", class: "bar-axis-label",
        });
        label.textContent = String(exponent);
        svg.appendChild(label);
      }
    });
  }

  function render() {
    const base = baseStepper.getValue();
    const shift = shiftStepper.getValue();
    const powers = Quantum.powersOnClock(base, clockSize, BAR_COUNT);
    drawChart(powers, shift);

    const comparedCount = BAR_COUNT - shift;
    let matchCount = 0;
    for (let exponent = shift; exponent < BAR_COUNT; exponent += 1) {
      if (powers[exponent - shift] === powers[exponent]) matchCount += 1;
    }
    const period = Quantum.periodOf(base, clockSize);
    const preview = `Powers of ${base}: ${powers.slice(0, SEQUENCE_PREVIEW_LENGTH).join(", ")}, …`;
    svg.setAttribute("aria-label",
      `Bar chart of powers of ${base} on a ${clockSize}-hour clock, ${base} to the 0 through ${BAR_COUNT - 1}. `
      + `A copy is slid right by ${shift}.`);

    if (period === null) {
      const shared = Quantum.greatestCommonDivisor(base, clockSize);
      readout.innerHTML = `
        <span class="readout-lead">${base} and ${clockSize} share the factor ${shared}.</span>
        <span class="readout-detail">So the powers never land on 1 again, and no slide lines up every bar.
          (Lucky, though: ${shared} already splits ${clockSize}.)</span>
        <span class="readout-detail">${preview}</span>`;
      return;
    }
    if (matchCount === comparedCount && shift === period) {
      readout.innerHTML = `
        <span class="readout-lead">Every bar lines up. The period is</span>
        <span class="readout-big">${period}</span>
        <span class="readout-detail">${preview}</span>`;
    } else if (matchCount === comparedCount) {
      readout.innerHTML = `
        <span class="readout-lead">Every bar lines up, but a shorter slide works too.</span>
        <span class="readout-detail">${preview}</span>`;
    } else {
      readout.innerHTML = `
        <span class="readout-lead">${matchCount} of ${comparedCount} bars line up.</span>
        <span class="readout-detail">Slide the outlined copy until every bar turns blue.</span>
        <span class="readout-detail">${preview}</span>`;
    }
  }

  function createBaseStepper(startValue) {
    baseSlot.replaceChildren();
    return Trapdoor.createStepper({
      container: baseSlot, label: "Number to raise to powers", min: 2, max: clockSize - 1,
      value: startValue, onChange: render,
    });
  }

  const baseSlot = document.createElement("div");
  const shiftSlot = document.createElement("div");
  controls.append(baseSlot, shiftSlot);
  let baseStepper = createBaseStepper(7);
  const shiftStepper = Trapdoor.createStepper({
    container: shiftSlot, label: "Slide the copy by", min: 1, max: MAX_SHIFT, value: 1, onChange: render,
  });

  clockButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clockSize = Number(button.dataset.clock);
      clockButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      baseStepper = createBaseStepper(Math.min(baseStepper.getValue(), clockSize - 1));
      shiftStepper.setValue(1);
      render();
    });
  });

  render();
})();
