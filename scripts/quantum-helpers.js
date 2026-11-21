/*
 * Chapter 8 helpers (Trapdoor.Quantum): powers on a clock, their period, and the walk from
 * a period to the two factors of the clock size. Pure functions, no drawing state.
 *
 * - Numbers here are small (clock sizes up to 35), so plain Numbers are exact; the powers
 *   still go through Trapdoor.wrap so the clock math matches chapter 3 exactly.
 * - planFactorWalk returns one of four honest outcomes, including the two unlucky ones.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }

  /** Euclid's algorithm with every line kept: [{ dividend, divisor, quotient, remainder }]. */
  function euclidSteps(first, second) {
    const steps = [];
    let dividend = Math.max(first, second);
    let divisor = Math.min(first, second);
    while (divisor > 0) {
      const quotient = Math.floor(dividend / divisor);
      const remainder = dividend - quotient * divisor;
      steps.push({ dividend, divisor, quotient, remainder });
      dividend = divisor;
      divisor = remainder;
    }
    return { steps, result: dividend };
  }

  function greatestCommonDivisor(first, second) {
    return euclidSteps(first, second).result;
  }

  /** base^0, base^1, ... base^(count-1), each wrapped onto a `clockSize`-hour clock. */
  function powersOnClock(base, clockSize, count) {
    const powers = [];
    let value = 1 % clockSize;
    for (let exponent = 0; exponent < count; exponent += 1) {
      powers.push(value);
      value = Number(Trapdoor.wrap(value * base, clockSize));
    }
    return powers;
  }

  /** Smallest r >= 1 with base^r landing on 1, or null when base shares a factor with the clock. */
  function periodOf(base, clockSize) {
    if (greatestCommonDivisor(base, clockSize) !== 1) return null;
    let value = Number(Trapdoor.wrap(base, clockSize));
    let period = 1;
    while (value !== 1) {
      value = Number(Trapdoor.wrap(value * base, clockSize));
      period += 1;
    }
    return period;
  }

  /**
   * Every step from "pick a base" to "here are the factors" for base on an N-hour clock.
   * Returns { kind, ... } with kind one of:
   *   "shared-factor": gcd(base, N) > 1 already splits N (lucky, no period needed).
   *   "odd-period":    the period is odd, so there is no half power. Try another base.
   *   "minus-one":     base^(r/2) lands on N - 1, so the gcds give only 1 and N. Try another base.
   *   "success":       gcd(h - 1, N) and gcd(h + 1, N) are the two factors.
   */
  function planFactorWalk(base, clockSize) {
    const sharedGcd = euclidSteps(base, clockSize);
    if (sharedGcd.result !== 1) {
      return { kind: "shared-factor", sharedGcd, factor: sharedGcd.result, other: clockSize / sharedGcd.result };
    }
    const period = periodOf(base, clockSize);
    const powers = powersOnClock(base, clockSize, period + 1);
    if (period % 2 === 1) return { kind: "odd-period", sharedGcd, period, powers };
    const halfPower = powers[period / 2];
    if (halfPower === clockSize - 1) return { kind: "minus-one", sharedGcd, period, powers, halfPower };
    const minusGcd = euclidSteps(halfPower - 1, clockSize);
    const plusGcd = euclidSteps(halfPower + 1, clockSize);
    return {
      kind: "success", sharedGcd, period, powers, halfPower, minusGcd, plusGcd,
      product: (halfPower - 1) * (halfPower + 1),
    };
  }

  Trapdoor.Quantum = { createSvgElement, euclidSteps, greatestCommonDivisor, powersOnClock, periodOf, planFactorWalk };
})();
