/*
 * Hops on the smooth curve: P, 2P = P + P, 3P = 2P + P, ... each one a use of the add rule.
 *
 * Expects #curve-hops-widget containing svg.curve-plot, .readout, .hop-list, and buttons
 * [data-action="next" | "play" | "reset"].
 *
 * - Only the latest hop's construction is drawn (line through the last hop and P, then flip),
 *   so the picture stays readable; earlier hops stay as light dots.
 * - Hops can leave the page (the curve runs off to infinity); the list still shows them.
 * - Dragging P starts the path over from the new point.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Curves = Trapdoor.Curves;
  const MAX_HOPS = 12;
  const PLAY_HOP_INTERVAL_MS = 650;

  const widget = document.getElementById("curve-hops-widget");
  const svg = widget.querySelector(".curve-plot");
  const readout = widget.querySelector(".readout");
  const hopList = widget.querySelector(".hop-list");
  const nextButton = widget.querySelector('[data-action="next"]');
  const playButton = widget.querySelector('[data-action="play"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  let startPoint = { x: 1, y: 1 };
  let startSampleIndex = Curves.nearestSampleIndex(...Curves.toScreen(startPoint));
  let hops = [startPoint];
  let playTimerId = null;

  function pathIsComplete() {
    return hops.length >= MAX_HOPS || hops[hops.length - 1] === null;
  }

  function stopPlaying() {
    clearInterval(playTimerId);
    playTimerId = null;
  }

  function addHop() {
    const result = Curves.addRealPoints(hops[hops.length - 1], startPoint);
    hops.push(result === null ? null : result.sum);
  }

  function hopName(hopNumber) {
    return hopNumber === 1 ? "P" : `${hopNumber}P`;
  }

  function drawPicture() {
    const overlay = Curves.drawCurveBase(svg);
    const hopCount = hops.length;
    const labels = [];
    hops.slice(0, -1).forEach((point) => {
      if (point === null || !Curves.isOnPage(point)) return;
      const [x, y] = Curves.toScreen(point);
      overlay.appendChild(Curves.createSvgElement("circle", { cx: x, cy: y, r: 6, class: "curve-hop-dot" }));
    });
    if (hopCount >= 2) {
      const previous = hops[hopCount - 2];
      const result = Curves.addRealPoints(previous, startPoint);
      const latestScreen = Curves.drawConstruction(overlay, startPoint, previous, result);
      if (latestScreen) labels.push({ anchor: latestScreen, text: hopName(hopCount), className: "curve-label curve-label-sum" });
      if (hopCount >= 3 && previous !== null && Curves.isOnPage(previous)) {
        labels.push({ anchor: Curves.toScreen(previous), text: hopName(hopCount - 1), className: "curve-label curve-label-soft" });
      }
    }
    const screenP = Curves.drawHandle(overlay, startPoint, "P", "Starting point P");
    labels.splice(hopCount >= 2 ? 1 : 0, 0, { anchor: screenP, text: "P", className: "curve-label" });
    Curves.placeLabels(overlay, labels);
  }

  function render() {
    drawPicture();
    const hopCount = hops.length;
    const latest = hops[hopCount - 1];
    let detail;
    if (hopCount === 1) detail = "Tap the next hop to add P to itself.";
    else if (latest === null) detail = "The line went straight up and down, so this hop lands on zero.";
    else if (!Curves.isOnPage(latest)) detail = "This hop is off the page. The curve keeps going, and so do the hops.";
    else if (hopCount === 2) detail = "P + P uses the tangent at P, then the flip.";
    else detail = `Line through ${hopName(hopCount - 1)} and P, then the flip.`;
    readout.innerHTML = `
      <span class="readout-lead">${hopCount === 1 ? "Start: P is at" : `${hopName(hopCount)} lands on`}</span>
      <span class="readout-coords">${Curves.formatRealPoint(latest)}</span>
      <span class="readout-detail">${detail}</span>`;
    svg.setAttribute("aria-label",
      `The curve with hops from P at ${Curves.formatRealPoint(startPoint)}. `
      + `Latest hop ${hopName(hopCount)} is at ${Curves.formatRealPoint(latest)}.`);

    hopList.replaceChildren(...hops.map((point, index) => {
      const item = document.createElement("li");
      item.textContent = `${hopName(index + 1)} → ${Curves.formatRealPoint(point)}`;
      return item;
    }));

    nextButton.disabled = pathIsComplete();
    playButton.disabled = pathIsComplete();
    playButton.textContent = playTimerId ? "Pause" : "Play all hops";
  }

  function restartFrom(sampleIndex) {
    stopPlaying();
    startSampleIndex = Math.max(0, Math.min(Curves.SAMPLES.length - 1, sampleIndex));
    startPoint = Curves.SAMPLES[startSampleIndex];
    hops = [startPoint];
    render();
  }

  Curves.attachCurveDragging(svg, {
    onDrag: (name, sampleIndex) => restartFrom(sampleIndex),
    onKeyStep: (name, step) => restartFrom(startSampleIndex + step),
    onTapCurve: (sampleIndex) => restartFrom(sampleIndex),
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
  resetButton.addEventListener("click", () => {
    stopPlaying();
    hops = [startPoint];
    render();
  });

  render();
})();
