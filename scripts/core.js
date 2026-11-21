/*
 * Trapdoor core: the shared namespace, exact clock arithmetic, and the stepper control.
 *
 * - Every clock calculation goes through BigInt, so results stay exact at any size
 *   (the challenge page works on a 39-digit clock).
 * - Classic script, not an ES module, so pages also work when opened straight from disk.
 * - Load this first; every widget script reads window.Trapdoor.
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});

  /** True when the reader asked the OS for less motion; widgets then snap instead of animating. */
  Trapdoor.prefersReducedMotion = function () {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  /**
   * Where `value` lands on a clock with `hours` hours, as a BigInt in [0, hours).
   *
   * JS `%` keeps the sign of the dividend (-1 % 12 is -1), so add the modulus back once.
   */
  Trapdoor.wrap = function (value, hours) {
    const bigValue = BigInt(value);
    const bigHours = BigInt(hours);
    return ((bigValue % bigHours) + bigHours) % bigHours;
  };

  /**
   * base ** exponent, wrapped onto a clock with `hours` hours, by square-and-multiply.
   *
   * Args:
   *     base, exponent, hours: integers (Number or BigInt); exponent >= 0, hours >= 1.
   * Returns:
   *     The landing spot as a BigInt.
   *
   * - Costs about log2(exponent) multiplications, and every intermediate is wrapped,
   *   so a 30-digit exponent on a 39-digit clock still finishes in well under a millisecond.
   */
  Trapdoor.powerOnClock = function (base, exponent, hours) {
    const bigHours = BigInt(hours);
    let remainingExponent = BigInt(exponent);
    let squaredBase = Trapdoor.wrap(base, bigHours);
    let result = 1n % bigHours;
    while (remainingExponent > 0n) {
      if (remainingExponent & 1n) result = (result * squaredBase) % bigHours;
      squaredBase = (squaredBase * squaredBase) % bigHours;
      remainingExponent >>= 1n;
    }
    return result;
  };

  /** Group digits with commas so long numbers stay readable ("1,000,003"). */
  Trapdoor.formatNumber = function (value) {
    return BigInt(value).toLocaleString("en-US");
  };

  /** Clamp a parsed integer into [min, max]; anything unparsable falls back to `fallback`. */
  function clampInteger(rawValue, min, max, fallback) {
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  /**
   * Build a labelled minus / number / plus control (plus an optional slider) inside `container`.
   *
   * Args:
   *     options.container: element to append into.
   *     options.label: visible label text.
   *     options.min, options.max, options.value: integer bounds and the start value.
   *     options.withSlider: also render a range input under the buttons.
   *     options.onChange(newValue): called after every user change.
   * Returns:
   *     { getValue(), setValue(newValue) }; setValue does not fire onChange.
   *
   * - Buttons are real <button>s at 44px, so touch, mouse, and keyboard all work.
   */
  Trapdoor.createStepper = function (options) {
    const { container, label, min, max, onChange, withSlider = false } = options;
    let currentValue = options.value;
    const inputId = `stepper-${Math.random().toString(36).slice(2, 9)}`;

    const wrapper = document.createElement("div");
    wrapper.className = "stepper";
    wrapper.innerHTML = `
      <label class="stepper-label" for="${inputId}"></label>
      <div class="stepper-row">
        <button type="button" class="stepper-button" data-delta="-1"></button>
        <input class="stepper-input" id="${inputId}" type="number" inputmode="numeric"
               min="${min}" max="${max}" step="1">
        <button type="button" class="stepper-button" data-delta="1"></button>
      </div>`;
    wrapper.querySelector(".stepper-label").textContent = label;
    const [minusButton, plusButton] = wrapper.querySelectorAll(".stepper-button");
    minusButton.textContent = "−";
    plusButton.textContent = "+";
    minusButton.setAttribute("aria-label", `Decrease ${label.toLowerCase()}`);
    plusButton.setAttribute("aria-label", `Increase ${label.toLowerCase()}`);
    const numberInput = wrapper.querySelector(".stepper-input");

    let slider = null;
    if (withSlider) {
      slider = document.createElement("input");
      slider.type = "range";
      slider.className = "stepper-slider";
      slider.min = String(min);
      slider.max = String(max);
      slider.setAttribute("aria-label", label);
      wrapper.appendChild(slider);
    }

    function showValue() {
      numberInput.value = String(currentValue);
      if (slider) slider.value = String(currentValue);
      minusButton.disabled = currentValue <= min;
      plusButton.disabled = currentValue >= max;
    }

    function commit(newValue) {
      const clamped = clampInteger(newValue, min, max, currentValue);
      const changed = clamped !== currentValue;
      currentValue = clamped;
      showValue();
      if (changed) onChange(currentValue);
    }

    minusButton.addEventListener("click", () => commit(currentValue - 1));
    plusButton.addEventListener("click", () => commit(currentValue + 1));
    numberInput.addEventListener("change", () => commit(numberInput.value));
    numberInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") commit(numberInput.value);
    });
    if (slider) slider.addEventListener("input", () => commit(slider.value));

    showValue();
    container.appendChild(wrapper);
    return {
      getValue: () => currentValue,
      setValue(newValue) {
        currentValue = clampInteger(newValue, min, max, currentValue);
        showValue();
      },
    };
  };
})();
