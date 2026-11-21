/*
 * Waves adding and cancelling, as arrows. A pattern pulses every r steps. To test a rhythm
 * of s, each pulse becomes an arrow pointing at where its time lands on an s-hour clock;
 * the arrows are chained tip to tail. The right rhythm points them all one way (loud);
 * a wrong one spins them round so they cancel (quiet).
 *
 * Expects #waves-widget containing svg.pulse-strip, svg.arrow-plot, .widget-controls,
 * .readout, and a button [data-action="new"].
 *
 * - This is the discrete Fourier sum of the pulse train at frequency 1/s. r is always prime
 *   (3, 5, 7) so that no smaller test rhythm also lines up, which keeps the cartoon honest.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Quantum = Trapdoor.Quantum;
  const TIME_STEPS = 40;
  const HIDDEN_PERIODS = [3, 5, 7];
  const CHAIN_LENGTH = 330;
  const PLOT_SIZE = 400;
  const STRIP_WIDTH = 600;
  const STRIP_HEIGHT = 92;
  const STRIP_LEFT = 12;
  const STRIP_BASELINE = 78;
  const STRIP_ARROW_LENGTH = 24;

  const widget = document.getElementById("waves-widget");
  const strip = widget.querySelector(".pulse-strip");
  const plot = widget.querySelector(".arrow-plot");
  const controls = widget.querySelector(".widget-controls");
  const readout = widget.querySelector(".readout");
  const newButton = widget.querySelector('[data-action="new"]');

  let hiddenPeriod = 5;

  function pulseTimes() {
    const times = [];
    for (let time = 0; time < TIME_STEPS; time += hiddenPeriod) times.push(time);
    return times;
  }

  /** Direction of a pulse at `time` on a `testPeriod`-hour clock: 0 at the top, clockwise. */
  function arrowDirection(time, testPeriod) {
    const angle = (2 * Math.PI * (time % testPeriod)) / testPeriod;
    return [Math.sin(angle), -Math.cos(angle)];
  }

  function addArrowMarker(svg, markerId, className) {
    const definitions = Quantum.createSvgElement("defs");
    const marker = Quantum.createSvgElement("marker", {
      id: markerId, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto",
    });
    marker.appendChild(Quantum.createSvgElement("path", { d: "M0 0 L10 5 L0 10 z", class: className }));
    definitions.appendChild(marker);
    svg.appendChild(definitions);
  }

  function drawStrip(testPeriod) {
    strip.replaceChildren();
    strip.setAttribute("viewBox", `0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`);
    addArrowMarker(strip, "strip-arrow", "wave-arrowhead");
    const slot = (STRIP_WIDTH - 2 * STRIP_LEFT) / TIME_STEPS;
    strip.appendChild(Quantum.createSvgElement("line", {
      x1: STRIP_LEFT, y1: STRIP_BASELINE, x2: STRIP_WIDTH - STRIP_LEFT, y2: STRIP_BASELINE, class: "pulse-axis",
    }));
    pulseTimes().forEach((time) => {
      const x = STRIP_LEFT + (time + 0.5) * slot;
      strip.appendChild(Quantum.createSvgElement("line", { x1: x, y1: STRIP_BASELINE, x2: x, y2: STRIP_BASELINE - 30, class: "pulse" }));
      const [directionX, directionY] = arrowDirection(time, testPeriod);
      const centerY = STRIP_BASELINE - 58;
      strip.appendChild(Quantum.createSvgElement("line", {
        x1: x - directionX * STRIP_ARROW_LENGTH * 0.5, y1: centerY - directionY * STRIP_ARROW_LENGTH * 0.5,
        x2: x + directionX * STRIP_ARROW_LENGTH * 0.5, y2: centerY + directionY * STRIP_ARROW_LENGTH * 0.5,
        class: "wave-arrow-small", "marker-end": "url(#strip-arrow)",
      }));
    });
  }

  /** Chain the arrows tip to tail and centre the whole drawing in the plot (no rescaling). */
  function drawChain(testPeriod) {
    const times = pulseTimes();
    const arrowLength = CHAIN_LENGTH / times.length;
    const corners = [[0, 0]];
    times.forEach((time) => {
      const [directionX, directionY] = arrowDirection(time, testPeriod);
      const [lastX, lastY] = corners[corners.length - 1];
      corners.push([lastX + directionX * arrowLength, lastY + directionY * arrowLength]);
    });
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    const shiftX = PLOT_SIZE / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
    const shiftY = PLOT_SIZE / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
    const placed = corners.map(([x, y]) => [x + shiftX, y + shiftY]);

    plot.replaceChildren();
    plot.setAttribute("viewBox", `0 0 ${PLOT_SIZE} ${PLOT_SIZE}`);
    addArrowMarker(plot, "chain-arrow", "wave-arrowhead-soft");
    addArrowMarker(plot, "total-arrow", "wave-arrowhead");
    const [startX, startY] = placed[0];
    const [endX, endY] = placed[placed.length - 1];
    if (Math.hypot(endX - startX, endY - startY) > 6) {
      plot.appendChild(Quantum.createSvgElement("line", {
        x1: startX, y1: startY, x2: endX, y2: endY, class: "wave-total", "marker-end": "url(#total-arrow)",
      }));
    }
    for (let index = 1; index < placed.length; index += 1) {
      const [fromX, fromY] = placed[index - 1];
      const [toX, toY] = placed[index];
      plot.appendChild(Quantum.createSvgElement("line", {
        x1: fromX, y1: fromY, x2: toX, y2: toY, class: "wave-arrow", "marker-end": "url(#chain-arrow)",
      }));
    }
    plot.appendChild(Quantum.createSvgElement("circle", { cx: startX, cy: startY, r: 6, class: "wave-start" }));
    return Math.hypot(endX - startX, endY - startY) / CHAIN_LENGTH;
  }

  function render() {
    const testPeriod = testStepper.getValue();
    drawStrip(testPeriod);
    const loudness = drawChain(testPeriod);
    // The epsilon keeps exact halves (8 pulses, one arrow left over = 12.5%) from flickering to 12.
    const percent = Math.round(loudness * 100 + 1e-9);
    const pulseCount = pulseTimes().length;
    const detail = testPeriod === hiddenPeriod
      ? `Every pulse lands at the top of a ${testPeriod}-hour clock, so all ${pulseCount} arrows point the same way and add up.`
      : `The pulses land all around a ${testPeriod}-hour clock, so the arrows point every which way and mostly cancel.`;
    readout.innerHTML = `
      <span class="readout-lead">A rhythm of ${testPeriod} comes out</span>
      <span class="readout-big">${percent}%</span>
      <span class="readout-detail">${detail}</span>`;
    strip.setAttribute("aria-label", `A pattern that pulses every ${hiddenPeriod} steps, at times ${pulseTimes().join(", ")}.`);
    plot.setAttribute("aria-label",
      `${pulseCount} arrows chained tip to tail for a test rhythm of ${testPeriod}; together they reach ${percent}% of full length.`);
  }

  const testStepper = Trapdoor.createStepper({
    container: controls, label: "Test a rhythm of", min: 2, max: 10, value: 4, onChange: render,
  });

  newButton.addEventListener("click", () => {
    const others = HIDDEN_PERIODS.filter((period) => period !== hiddenPeriod);
    hiddenPeriod = others[Math.floor(Math.random() * others.length)];
    render();
  });

  render();
})();
