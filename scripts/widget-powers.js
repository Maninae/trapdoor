/*
 * Powers on a prime clock: multiply by the same base again and again and draw each hop.
 *
 * Expects #powers-widget containing .dial, .readout, .widget-controls, .prime-picker
 * (buttons with data-prime), .hop-list (ordered list), and buttons
 * [data-action="next" | "play" | "reset"].
 *
 * - Each hop is the previous landing times the base, wrapped: the shortcut from the
 *   arithmetic section, so numbers never grow.
 * - The path ends when it lands back on 1, because from there it repeats exactly.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const PLAY_HOP_INTERVAL_MS = 380;
  const DEFAULT_PRIME = 17;
  const DEFAULT_BASE = 3;

  const widget = document.getElementById("powers-widget");
  const dialSvg = widget.querySelector(".dial");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");
  const primeButtons = widget.querySelectorAll(".prime-picker button");
  const hopList = widget.querySelector(".hop-list");
  const nextButton = widget.querySelector('[data-action="next"]');
  const playButton = widget.querySelector('[data-action="play"]');
  const resetButton = widget.querySelector('[data-action="reset"]');

  let currentPrime = DEFAULT_PRIME;
  let landings = [];
  let playTimerId = null;

  function pathIsComplete() {
    return landings.length > 0 && landings[landings.length - 1] === 1;
  }

  function stopPlaying() {
    clearInterval(playTimerId);
    playTimerId = null;
  }

  function addHop() {
    const base = baseStepper.getValue();
    const previous = landings.length === 0 ? 1 : landings[landings.length - 1];
    landings.push(Number(Trapdoor.wrap(BigInt(previous) * BigInt(base), currentPrime)));
  }

  function render() {
    const base = baseStepper.getValue();
    const marks = {};
    landings.forEach((landing) => { marks[landing] = "visited"; });
    if (landings.length > 0) marks[landings[landings.length - 1]] = "landed";
    const chords = [];
    for (let hopIndex = 1; hopIndex < landings.length; hopIndex += 1) {
      chords.push([landings[hopIndex - 1], landings[hopIndex]]);
    }
    Trapdoor.renderDial(dialSvg, { hours: currentPrime, marks, chords });
    dialSvg.setAttribute(
      "aria-label",
      `A ${currentPrime}-hour clock. Powers of ${base} land on ${landings.join(", ") || "nothing yet"}.`,
    );

    hopList.replaceChildren();
    landings.forEach((landing, hopIndex) => {
      const item = document.createElement("li");
      item.innerHTML = `${base}<sup>${hopIndex + 1}</sup> → ${landing}`;
      hopList.appendChild(item);
    });

    const exponent = landings.length;
    if (exponent === 0) {
      readout.innerHTML = `<span class="readout-lead">Tap the next hop to start at ${base}<sup>1</sup>.</span>`;
    } else {
      const latest = landings[exponent - 1];
      const repeatNote = pathIsComplete()
        ? `<span class="readout-detail">Back to 1 after ${exponent} hops. From here the path repeats.</span>`
        : `<span class="readout-detail">Next: ${latest} × ${base} = ${latest * base}, then wrap.</span>`;
      readout.innerHTML = `
        <span class="readout-lead">${base}<sup>${exponent}</sup> lands on</span>
        <span class="readout-big">${latest}</span>
        ${repeatNote}`;
    }

    nextButton.disabled = pathIsComplete();
    playButton.disabled = pathIsComplete();
    playButton.textContent = playTimerId ? "Pause" : "Play all hops";
  }

  function resetPath() {
    stopPlaying();
    landings = [];
    render();
  }

  function playAllHops() {
    if (playTimerId) {
      stopPlaying();
      render();
      return;
    }
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
  }

  /** The base stepper's maximum depends on the clock size, so it is rebuilt per prime. */
  function createBaseStepper(startValue) {
    controls.replaceChildren();
    return Trapdoor.createStepper({
      container: controls, label: "Number to multiply by", min: 2, max: currentPrime - 1,
      value: startValue, onChange: resetPath,
    });
  }

  let baseStepper = createBaseStepper(DEFAULT_BASE);

  primeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentPrime = Number(button.dataset.prime);
      primeButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      baseStepper = createBaseStepper(Math.min(baseStepper.getValue(), currentPrime - 1));
      resetPath();
    });
  });

  nextButton.addEventListener("click", () => {
    stopPlaying();
    addHop();
    render();
  });
  playButton.addEventListener("click", playAllHops);
  resetButton.addEventListener("click", resetPath);

  render();
})();
