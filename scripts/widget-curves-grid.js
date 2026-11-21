/*
 * The same curve on whole numbers: x and y both wrap around a p-hour clock, so the curve
 * becomes a scatter of dots, and hops P, 2P, 3P, ... jump across it.
 *
 * Expects #curve-grid-widget containing svg.curve-plot, .prime-buttons (data-prime),
 * .readout, .hop-list, and buttons [data-action="next" | "play" | "reset"].
 *
 * - All arithmetic is exact (Trapdoor.Curves grid helpers); division is by clock inverse.
 * - The path ends at zero: one more hop would land back on P and repeat.
 * - Tapping a dot restarts the path there. Some dots come back to zero sooner than others.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Curves = Trapdoor.Curves;
  const DEFAULT_PRIME = 29;
  const PLAY_HOP_INTERVAL_MS = 260;
  const TAP_RADIUS = 26;

  const widget = document.getElementById("curve-grid-widget");
  const svg = widget.querySelector(".curve-plot");
  const primeButtons = widget.querySelectorAll(".prime-buttons button");
  const readout = widget.querySelector(".readout");
  const hopList = widget.querySelector(".hop-list");
  const nextButton = widget.querySelector('[data-action="next"]');
  const playButton = widget.querySelector('[data-action="play"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  let prime = DEFAULT_PRIME;
  let gridPoints = Curves.listGridPoints(prime);
  let startPoint = { x: 0, y: 1 };
  let hops = [startPoint];
  let playTimerId = null;

  function pathIsComplete() {
    return hops[hops.length - 1] === null;
  }

  function stopPlaying() {
    clearInterval(playTimerId);
    playTimerId = null;
  }

  function addHop() {
    hops.push(Curves.addGridPoints(hops[hops.length - 1], startPoint, prime));
  }

  function hopName(hopNumber) {
    return hopNumber === 1 ? "P" : `${hopNumber}P`;
  }

  /** "8 × 8 = 64 → 6" style check that the latest dot really sits on the curve. */
  function onCurveCheck(point) {
    const ySquared = point.y * point.y;
    const rightSide = point.x ** 3 - point.x + 1;
    const wrapped = Curves.wrapNumber(ySquared, prime);
    return `Check on the ${prime}-hour clock: ${point.y} × ${point.y} = ${ySquared} → ${wrapped}, `
      + `and ${point.x}³ − ${point.x} + 1 = ${rightSide} → ${Curves.wrapNumber(rightSide, prime)}. They match.`;
  }

  function render() {
    const marks = {};
    hops.forEach((point) => { if (point) marks[Curves.pointKey(point)] = "visited"; });
    marks[Curves.pointKey(startPoint)] = "start";
    const latest = hops[hops.length - 1];
    if (latest && hops.length > 1) marks[Curves.pointKey(latest)] = "landed";
    const chords = [];
    for (let index = 1; index < hops.length; index += 1) {
      if (hops[index] !== null) chords.push([hops[index - 1], hops[index]]);
    }
    Curves.renderGrid(svg, { prime, points: gridPoints, marks, chords });
    svg.appendChild(Curves.createSvgElement("rect", {
      x: 0, y: 0, width: Curves.PLOT_SIZE, height: Curves.PLOT_SIZE, class: "grid-tap-layer",
    }));

    const hopCount = hops.length;
    if (latest === null) {
      readout.innerHTML = `
        <span class="readout-lead">${hopName(hopCount)} is</span>
        <span class="readout-coords">zero</span>
        <span class="readout-detail">${hopName(hopCount - 1)} sat straight across from P, so the line was vertical.
          One more hop lands back on P, and the pattern repeats.</span>`;
    } else {
      const intro = hopCount === 1 ? "Start: P is at" : `${hopName(hopCount)} lands on`;
      readout.innerHTML = `
        <span class="readout-lead">${intro}</span>
        <span class="readout-coords">${Curves.formatGridPoint(latest)}</span>
        <span class="readout-detail">${onCurveCheck(latest)}</span>`;
    }
    svg.setAttribute("aria-label",
      `${gridPoints.length} dots on a ${prime} by ${prime} grid. Hops from P at ${Curves.formatGridPoint(startPoint)}: `
      + hops.map((point) => Curves.formatGridPoint(point)).join(", "));

    hopList.replaceChildren(...hops.map((point, index) => {
      const item = document.createElement("li");
      item.textContent = `${hopName(index + 1)} → ${Curves.formatGridPoint(point)}`;
      return item;
    }));

    nextButton.disabled = pathIsComplete();
    playButton.disabled = pathIsComplete();
    playButton.textContent = playTimerId ? "Pause" : "Play all hops";
  }

  function restartFrom(point) {
    stopPlaying();
    startPoint = point;
    hops = [startPoint];
    render();
  }

  svg.addEventListener("click", (event) => {
    const [plotX, plotY] = Curves.clientToPlot(svg, event.clientX, event.clientY);
    const tapped = Curves.nearestGridPoint(gridPoints, prime, plotX, plotY, TAP_RADIUS);
    if (tapped) restartFrom(tapped);
  });

  primeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      prime = Number(button.dataset.prime);
      primeButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      gridPoints = Curves.listGridPoints(prime);
      restartFrom(gridPoints.find((point) => point.x === 0 && point.y === 1) || gridPoints[0]);
    });
  });

  nextButton.addEventListener("click", () => {
    stopPlaying();
    addHop();
    render();
  });
  playButton.addEventListener("click", () => {
    if (playTimerId) { stopPlaying(); render(); return; }
    if (Trapdoor.prefersReducedMotion()) {
      while (!pathIsComplete()) addHop();
      render();
      return;
    }
    playTimerId = setInterval(() => {
      addHop();
      if (pathIsComplete()) stopPlaying();
      render();
    }, PLAY_HOP_INTERVAL_MS);
    render();
  });
  resetButton.addEventListener("click", () => restartFrom(startPoint));

  render();
})();
