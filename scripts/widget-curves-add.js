/*
 * Hero widget for chapter 7: drag P and Q along y^2 = x^3 - x + 1 and watch P + Q get built.
 *
 * Expects #curve-add-widget containing svg.curve-plot, .readout, and ol.construction-steps.
 *
 * - The rule: line through P and Q, find the third crossing, flip it over the x-axis.
 * - P on top of Q uses the tangent line; a vertical line gives "zero" (no third crossing).
 * - Tapping the curve off a handle moves whichever handle is nearer to the tap.
 */
(function () {
  "use strict";

  const Curves = window.Trapdoor.Curves;
  const widget = document.getElementById("curve-add-widget");
  const svg = widget.querySelector(".curve-plot");
  const readout = widget.querySelector(".readout");
  const stepsList = widget.querySelector(".construction-steps");

  const handles = {
    P: { point: { x: -1, y: 1 }, sampleIndex: 0 },
    Q: { point: { x: 1, y: 1 }, sampleIndex: 0 },
  };
  Object.values(handles).forEach((handle) => {
    const [x, y] = Curves.toScreen(handle.point);
    handle.sampleIndex = Curves.nearestSampleIndex(x, y);
  });

  function moveHandle(name, sampleIndex) {
    const clamped = Math.max(0, Math.min(Curves.SAMPLES.length - 1, sampleIndex));
    handles[name].sampleIndex = clamped;
    handles[name].point = Curves.SAMPLES[clamped];
    render();
  }

  function describeSteps(result, samePoint) {
    if (result === null) {
      return [
        "The line through P and Q is straight up and down.",
        "It never crosses the curve a third time.",
        "So P + Q is zero, the extra point that adds nothing.",
      ];
    }
    const first = samePoint
      ? "P and Q are the same point, so use the tangent: the line that just touches the curve there."
      : "Draw the line through P and Q.";
    const pageNote = Curves.isOnPage(result.third) ? "" : " (off the page)";
    return [
      first,
      `It crosses the curve once more at ${Curves.formatRealPoint(result.third)}${pageNote}.`,
      `Flip that over the x-axis: ${Curves.formatRealPoint(result.sum)}.`,
    ];
  }

  function render() {
    const pointP = handles.P.point;
    const pointQ = handles.Q.point;
    const samePoint = handles.P.sampleIndex === handles.Q.sampleIndex
      || (pointP.x === pointQ.x && pointP.y === pointQ.y);
    const result = Curves.addRealPoints(pointP, samePoint ? pointP : pointQ);

    const overlay = Curves.drawCurveBase(svg);
    const sumScreen = Curves.drawConstruction(overlay, pointP, pointQ, result);
    const screenP = Curves.drawHandle(overlay, pointP, "P", "Point P");
    const screenQ = Curves.drawHandle(overlay, pointQ, "Q", "Point Q");

    const labels = [];
    if (sumScreen) labels.push({ anchor: sumScreen, text: "P + Q", className: "curve-label curve-label-sum" });
    labels.push({ anchor: screenP, text: "P", className: "curve-label" });
    if (!samePoint) labels.push({ anchor: screenQ, text: "Q", className: "curve-label" });
    Curves.placeLabels(overlay, labels);

    const sumText = result === null ? "zero" : Curves.formatRealPoint(result.sum);
    svg.setAttribute("aria-label",
      `The curve y squared equals x cubed minus x plus 1. P is at ${Curves.formatRealPoint(pointP)}, `
      + `Q is at ${Curves.formatRealPoint(pointQ)}, and P plus Q is ${sumText}.`);
    const offPage = result !== null && !Curves.isOnPage(result.sum)
      ? '<span class="readout-detail">Off the page: drag P and Q apart to bring it back.</span>' : "";
    readout.innerHTML = `
      <span class="readout-lead">P + Q lands on</span>
      <span class="readout-coords">${sumText}</span>${offPage}`;
    // Keep each "(x, y)" on one line so a coordinate never breaks after its comma.
    stepsList.replaceChildren(...describeSteps(result, samePoint).map((text) => {
      const item = document.createElement("li");
      text.split(/(\([^)]*\))/).forEach((piece) => {
        if (!piece.startsWith("(") || !piece.includes(",")) { item.append(piece); return; }
        const coordinate = document.createElement("span");
        coordinate.style.whiteSpace = "nowrap";
        coordinate.textContent = piece;
        item.append(coordinate);
      });
      return item;
    }));
  }

  Curves.attachCurveDragging(svg, {
    onDrag: moveHandle,
    onKeyStep: (name, step) => moveHandle(name, handles[name].sampleIndex + step),
    onTapCurve(sampleIndex, plotX, plotY) {
      const distanceTo = (name) => {
        const [x, y] = Curves.toScreen(handles[name].point);
        return (x - plotX) ** 2 + (y - plotY) ** 2;
      };
      moveHandle(distanceTo("P") <= distanceTo("Q") ? "P" : "Q", sampleIndex);
    },
  });

  render();
})();
