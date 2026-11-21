/*
 * Chapter 5 helpers: random primes of a given size, and short human durations.
 *
 * - isPrime is Miller-Rabin with the first 13 primes as bases, which is exact (not just
 *   "probably prime") for every n below 3.3 * 10^24; this page never goes past 24 digits.
 * - Random digits come from crypto.getRandomValues.
 * - Exposed as Trapdoor.twoKeys so the chapter's widgets can share them.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const MILLER_RABIN_BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];

  function isPrime(candidate) {
    const n = BigInt(candidate);
    if (n < 2n) return false;
    for (const base of MILLER_RABIN_BASES) {
      if (n === base) return true;
      if (n % base === 0n) return false;
    }
    // Write n - 1 as oddPart * 2^twos.
    let oddPart = n - 1n;
    let twos = 0;
    while ((oddPart & 1n) === 0n) {
      oddPart >>= 1n;
      twos += 1;
    }
    for (const base of MILLER_RABIN_BASES) {
      let value = Trapdoor.powerOnClock(base, oddPart, n);
      if (value === 1n || value === n - 1n) continue;
      let witnessFound = true;
      for (let round = 1; round < twos; round += 1) {
        value = (value * value) % n;
        if (value === n - 1n) {
          witnessFound = false;
          break;
        }
      }
      if (witnessFound) return false;
    }
    return true;
  }

  /** Uniform-ish random BigInt in [low, high). */
  function randomBigIntBelow(low, high) {
    const span = high - low;
    const randomWords = new Uint32Array(4);
    crypto.getRandomValues(randomWords);
    let randomValue = 0n;
    randomWords.forEach((word) => { randomValue = (randomValue << 32n) | BigInt(word); });
    return low + (randomValue % span);
  }

  /** A random prime with exactly `digitCount` digits. */
  function randomPrimeWithDigits(digitCount) {
    const low = 10n ** BigInt(digitCount - 1);
    const high = 10n ** BigInt(digitCount);
    for (;;) {
      const candidate = randomBigIntBelow(low, high);
      if (isPrime(candidate)) return candidate;
    }
  }

  /**
   * Two different primes whose product has exactly `productDigits` digits (an even count),
   * returned smaller first.
   */
  function randomPrimePairForDigits(productDigits) {
    const primeDigits = productDigits / 2;
    for (;;) {
      const first = randomPrimeWithDigits(primeDigits);
      const second = randomPrimeWithDigits(primeDigits);
      if (first === second) continue;
      if ((first * second).toString().length !== productDigits) continue;
      return first < second ? [first, second] : [second, first];
    }
  }

  /** "under 1 ms", "340 ms", "12 seconds", "4 minutes", "3 hours", "5 days", "2 years". */
  function formatDuration(milliseconds) {
    if (milliseconds < 1) return "under 1 ms";
    if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
    const units = [
      ["year", 365.25 * 24 * 3600],
      ["day", 24 * 3600],
      ["hour", 3600],
      ["minute", 60],
      ["second", 1],
    ];
    const seconds = milliseconds / 1000;
    for (const [unitName, unitSeconds] of units) {
      if (seconds >= unitSeconds) {
        const count = Math.round(seconds / unitSeconds);
        return `${count.toLocaleString("en-US")} ${unitName}${count === 1 ? "" : "s"}`;
      }
    }
    return `${seconds.toFixed(1)} seconds`;
  }

  /** Integer square root of a non-negative BigInt (Newton's method). */
  function integerSquareRoot(value) {
    if (value < 2n) return value;
    let estimate = BigInt(Math.floor(Math.sqrt(Number(value)))) + 1n;
    for (;;) {
      const next = (estimate + value / estimate) >> 1n;
      if (next >= estimate) break;
      estimate = next;
    }
    while (estimate * estimate > value) estimate -= 1n;
    while ((estimate + 1n) * (estimate + 1n) <= value) estimate += 1n;
    return estimate;
  }

  Trapdoor.twoKeys = { isPrime, randomPrimeWithDigits, randomPrimePairForDigits, formatDuration, integerSquareRoot };
})();
