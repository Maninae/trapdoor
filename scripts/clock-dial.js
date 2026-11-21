/*
 * Clock dial: draws one clock face as inline SVG. Every widget on the page reuses it.
 *
 * - Hour 0 sits at the top (where a wall clock shows 12) and hours run clockwise.
 * - The dial is redrawn from scratch on every update; at most 30 hours it costs nothing.
 * - Colors come from CSS classes (styles/shared.css), never from hex values in here.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  const VIEWBOX_SIZE = 400;
  const DIAL_CENTER = VIEWBOX_SIZE / 2;
  const RING_RADIUS = 138;
  const LABEL_RADIUS = 170;
  const ARC_RADIUS = 112;
  const HAND_LENGTH = 118;
  const MARK_RADIUS_BY_ROLE = {
    landed: 12,
    visited: 7,
    start: 9,
    target: 13,
    miss: 6,
  };

  let arrowMarkerCount = 0;

  /** Angle in degrees for hour `hourIndex` on an `hours`-hour dial (0 at top, clockwise). */
  function angleForHour(hourIndex, hours) {
    return (360 * hourIndex) / hours - 90;
  }

  /** SVG coordinates of hour `hourIndex` at distance `radius` from the center. */
  function pointForHour(hourIndex, hours, radius) {
    const radians = (angleForHour(hourIndex, hours) * Math.PI) / 180;
    return [DIAL_CENTER + radius * Math.cos(radians), DIAL_CENTER + radius * Math.sin(radians)];
  }

  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  /** Font size shrinks a little on crowded dials so 30 labels never touch. */
  function labelFontSize(hours) {
    return hours > 20 ? 15 : 18;
  }

  /**
   * Draw a dial into `svg`, replacing whatever was there.
   *
   * Args:
   *     svg: the <svg> element to draw into.
   *     options.hours: number of hours on the clock (5 to 30 on this page).
   *     options.marks: { hourIndex: role } with role in landed / visited / start / target / miss.
   *     options.chords: [[fromHour, toHour], ...] hops drawn as arrowed lines; the last one is bold.
   *     options.arc: { fromHour, steps } a clockwise arrowed arc inside the ring (addition).
   *     options.showHand: draw a hand, rotated later through the returned setHandAngle.
   * Returns:
   *     { setHandAngle(degrees) } where 0 points at hour 0 and angles keep growing past 360.
   */
  Trapdoor.renderDial = function (svg, options) {
    const { hours, marks = {}, chords = [], arc = null, showHand = false } = options;
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);

    arrowMarkerCount += 1;
    const arrowId = `dial-arrow-${arrowMarkerCount}`;
    const definitions = createSvgElement("defs", {});
    const arrowMarker = createSvgElement("marker", {
      id: arrowId, viewBox: "0 0 10 10", refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse",
    });
    arrowMarker.appendChild(createSvgElement("path", { d: "M0 0 L10 5 L0 10 z", class: "dial-arrowhead" }));
    definitions.appendChild(arrowMarker);
    svg.appendChild(definitions);

    svg.appendChild(createSvgElement("circle", {
      cx: DIAL_CENTER, cy: DIAL_CENTER, r: RING_RADIUS, class: "dial-ring",
    }));

    if (arc && arc.steps > 0) {
      const [startX, startY] = pointForHour(arc.fromHour, hours, ARC_RADIUS);
      const [endX, endY] = pointForHour(arc.fromHour + arc.steps, hours, ARC_RADIUS);
      const largeArcFlag = arc.steps / hours > 0.5 ? 1 : 0;
      svg.appendChild(createSvgElement("path", {
        d: `M${startX} ${startY} A${ARC_RADIUS} ${ARC_RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        class: "dial-arc", "marker-end": `url(#${arrowId})`,
      }));
    }

    chords.forEach(([fromHour, toHour], chordIndex) => {
      const [fromX, fromY] = pointForHour(fromHour, hours, RING_RADIUS);
      const [toX, toY] = pointForHour(toHour, hours, RING_RADIUS);
      // Stop the line short of the target dot so the arrowhead stays visible.
      const length = Math.hypot(toX - fromX, toY - fromY) || 1;
      const shortenBy = Math.min(14, length / 3);
      const isLatest = chordIndex === chords.length - 1;
      svg.appendChild(createSvgElement("line", {
        x1: fromX, y1: fromY,
        x2: toX - ((toX - fromX) / length) * shortenBy,
        y2: toY - ((toY - fromY) / length) * shortenBy,
        class: isLatest ? "dial-chord dial-chord-latest" : "dial-chord",
        "marker-end": `url(#${arrowId})`,
      }));
    });

    const fontSize = labelFontSize(hours);
    for (let hourIndex = 0; hourIndex < hours; hourIndex += 1) {
      const role = marks[hourIndex];
      const [dotX, dotY] = pointForHour(hourIndex, hours, RING_RADIUS);
      svg.appendChild(createSvgElement("circle", {
        cx: dotX, cy: dotY,
        r: role ? MARK_RADIUS_BY_ROLE[role] : 3.5,
        class: role ? `dial-mark dial-mark-${role}` : "dial-tick",
      }));
      const [labelX, labelY] = pointForHour(hourIndex, hours, LABEL_RADIUS);
      const label = createSvgElement("text", {
        x: labelX, y: labelY, "font-size": fontSize,
        "text-anchor": "middle", "dominant-baseline": "central",
        class: role ? `dial-label dial-label-${role}` : "dial-label",
      });
      label.textContent = String(hourIndex);
      svg.appendChild(label);
    }

    let handGroup = null;
    if (showHand) {
      handGroup = createSvgElement("g", { class: "dial-hand" });
      handGroup.appendChild(createSvgElement("line", {
        x1: DIAL_CENTER, y1: DIAL_CENTER, x2: DIAL_CENTER, y2: DIAL_CENTER - HAND_LENGTH,
      }));
      handGroup.appendChild(createSvgElement("circle", { cx: DIAL_CENTER, cy: DIAL_CENTER, r: 6 }));
      svg.appendChild(handGroup);
    }

    return {
      setHandAngle(degrees) {
        if (handGroup) handGroup.setAttribute("transform", `rotate(${degrees} ${DIAL_CENTER} ${DIAL_CENTER})`);
      },
    };
  };
})();
