/*
 * "Count the letters": a bar chart of how often each letter appears in the mystery
 * message, drawn over gray marks for typical English. Shift the bars until they match.
 *
 * Expects #frequency-widget containing svg.frequency-chart, .widget-controls, .readout,
 * and a button [data-action="match-e"].
 *
 * - Bars are the message's letter percents after shifting back; gray dashes are English.
 * - The bars only line up with the dashes at the right shift, which is the whole trick.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const {
    ALPHABET, ENGLISH_LETTER_PERCENT, MYSTERY_SHIFT, mysteryCiphertext, shiftText, letterPercents, createSvgElement,
  } = Trapdoor.secretCodes;

  const CHART_WIDTH = 390;
  const CHART_HEIGHT = 210;
  const BAR_STEP = CHART_WIDTH / ALPHABET.length;
  const BAR_WIDTH = BAR_STEP * 0.62;
  const PLOT_TOP = 14;
  const PLOT_BOTTOM = 178;
  const LABEL_BASELINE = 198;
  const MAX_PERCENT_SHOWN = 22;
  const PREVIEW_LENGTH = 58;

  const widget = document.getElementById("frequency-widget");
  const chartSvg = widget.querySelector(".frequency-chart");
  const controls = widget.querySelector(".widget-controls");
  const readout = widget.querySelector(".readout");
  const matchButton = widget.querySelector('[data-action="match-e"]');

  function heightForPercent(percent) {
    return ((PLOT_BOTTOM - PLOT_TOP) * Math.min(percent, MAX_PERCENT_SHOWN)) / MAX_PERCENT_SHOWN;
  }

  function tallestLetter(percents) {
    return ALPHABET.split("").reduce((best, letter) => (percents[letter] > percents[best] ? letter : best), "A");
  }

  function drawChart(percents) {
    chartSvg.replaceChildren();
    chartSvg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    chartSvg.appendChild(createSvgElement("line", {
      x1: 0, x2: CHART_WIDTH, y1: PLOT_BOTTOM, y2: PLOT_BOTTOM, class: "chart-baseline",
    }));
    Array.from(ALPHABET).forEach((letter, letterIndex) => {
      const centerX = BAR_STEP * (letterIndex + 0.5);
      const barHeight = heightForPercent(percents[letter]);
      chartSvg.appendChild(createSvgElement("rect", {
        x: centerX - BAR_WIDTH / 2, y: PLOT_BOTTOM - barHeight, width: BAR_WIDTH, height: barHeight,
        class: "chart-bar",
      }));
      const englishY = PLOT_BOTTOM - heightForPercent(ENGLISH_LETTER_PERCENT[letter]);
      chartSvg.appendChild(createSvgElement("line", {
        x1: centerX - BAR_STEP / 2 + 1, x2: centerX + BAR_STEP / 2 - 1, y1: englishY, y2: englishY,
        class: "chart-english-mark",
      }));
      const label = createSvgElement("text", {
        x: centerX, y: LABEL_BASELINE, "font-size": 14.5, "text-anchor": "middle",
        class: letter === "E" ? "chart-label chart-label-e" : "chart-label",
      });
      label.textContent = letter;
      chartSvg.appendChild(label);
    });
  }

  function update(shiftBack) {
    const attempt = shiftText(mysteryCiphertext, -shiftBack);
    const percents = letterPercents(attempt);
    drawChart(percents);
    const tallest = tallestLetter(percents);
    const solved = shiftBack === MYSTERY_SHIFT;
    chartSvg.setAttribute("aria-label",
      `Letter counts after shifting back ${shiftBack}. The tallest bar is ${tallest}.` +
      (solved ? " The bars match English." : ""));

    readout.replaceChildren();
    const lead = document.createElement("span");
    lead.className = "readout-lead";
    lead.textContent = solved ? `Shift back ${shiftBack}: the bars match English.` : `Shift back ${shiftBack}. Tallest bar: ${tallest}.`;
    const preview = document.createElement("span");
    preview.className = solved ? "readout-code" : "readout-code readout-code-muted";
    preview.textContent = solved ? attempt : `${attempt.slice(0, PREVIEW_LENGTH)}…`;
    readout.append(lead, preview);
  }

  const shiftStepper = Trapdoor.createStepper({
    container: controls, label: "Shift the message back", min: 0, max: 25,
    value: 0, withSlider: true,
    onChange: (shiftBack) => update(shiftBack),
  });

  // One count does the whole job: slide the tallest bar onto E.
  matchButton.addEventListener("click", () => {
    const tallestInCiphertext = tallestLetter(letterPercents(mysteryCiphertext));
    const shiftBack = (ALPHABET.indexOf(tallestInCiphertext) - ALPHABET.indexOf("E") + 26) % 26;
    shiftStepper.setValue(shiftBack);
    update(shiftBack);
  });

  update(0);
})();
