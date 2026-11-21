/*
 * Opening widget: pick a clock size and a number, watch the hand count around and land.
 *
 * Expects #wrap-widget containing .dial (svg), .readout, and .widget-controls.
 * The hand sweeps the full distance (every lap) so the reader sees the wrap happen;
 * under prefers-reduced-motion (Trapdoor.prefersReducedMotion in core.js), or when the jump
 * is long, it snaps.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const DEFAULT_HOURS = 12;
  const DEFAULT_NUMBER = 15;
  const MAX_NUMBER = 9999;
  const MS_PER_LAP = 320;
  const MAX_SWEEP_MS = 1400;
  const MAX_ANIMATED_LAPS = 12;

  const widget = document.getElementById("wrap-widget");
  const dialSvg = widget.querySelector(".dial");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");

  let shownHandAngle = 0;
  let animationFrameId = null;
  let dial = null;

  /** Ease-in-out so the hand speeds up through the laps and settles on the landing. */
  function easeInOut(progress) {
    return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
  }

  function sweepHandTo(targetAngle, hours) {
    cancelAnimationFrame(animationFrameId);
    const startAngle = shownHandAngle;
    const lapsToTravel = Math.abs(targetAngle - startAngle) / 360;
    if (Trapdoor.prefersReducedMotion() || lapsToTravel > MAX_ANIMATED_LAPS || lapsToTravel === 0) {
      shownHandAngle = targetAngle;
      dial.setHandAngle(targetAngle);
      return;
    }
    const durationMs = Math.min(MAX_SWEEP_MS, Math.max(260, lapsToTravel * MS_PER_LAP));
    const startTime = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      shownHandAngle = startAngle + (targetAngle - startAngle) * easeInOut(progress);
      dial.setHandAngle(shownHandAngle);
      if (progress < 1) animationFrameId = requestAnimationFrame(step);
    }
    animationFrameId = requestAnimationFrame(step);
  }

  function describeLaps(number, hours, fullLaps, landing) {
    if (fullLaps === 0n) return `${number} is less than ${hours}, so it never wraps.`;
    const lapWord = fullLaps === 1n ? "lap" : "laps";
    return `${number} = ${fullLaps} × ${hours} + ${landing}: ${fullLaps} full ${lapWord}, ${landing} left over.`;
  }

  function update({ animate }) {
    const hours = hoursStepper.getValue();
    const number = numberStepper.getValue();
    const landing = Trapdoor.wrap(number, hours);
    const fullLaps = BigInt(number) / BigInt(hours);

    dial = Trapdoor.renderDial(dialSvg, {
      hours,
      marks: { [Number(landing)]: "landed" },
      showHand: true,
    });
    dialSvg.setAttribute("aria-label", `A ${hours}-hour clock. ${number} lands on ${landing}.`);

    readout.innerHTML = `
      <span class="readout-lead">${number} lands on</span>
      <span class="readout-big">${landing}</span>
      <span class="readout-detail">${describeLaps(number, hours, fullLaps, landing)}</span>`;

    const targetAngle = (360 * number) / hours;
    if (animate) {
      sweepHandTo(targetAngle, hours);
    } else {
      cancelAnimationFrame(animationFrameId);
      shownHandAngle = targetAngle;
      dial.setHandAngle(targetAngle);
    }
  }

  const numberStepper = Trapdoor.createStepper({
    container: controls, label: "Count up to", min: 0, max: MAX_NUMBER,
    value: DEFAULT_NUMBER,
    onChange: () => update({ animate: true }),
  });
  const hoursStepper = Trapdoor.createStepper({
    container: controls, label: "Hours on the clock", min: 5, max: 30,
    value: DEFAULT_HOURS, withSlider: true,
    onChange: () => update({ animate: false }),
  });

  // The page's one load-time motion: the hand counts from 0 up to the starting number.
  update({ animate: true });
})();
