/*
 * Size chart for chapter 11: public-key and signature/ciphertext sizes across the families,
 * as horizontal bars, either to scale or on a log scale so the small ones stay visible.
 * Tapping a row puts its numbers in the readout.
 *
 * Expects #size-chart-widget with .readout, .size-chart, .size-axis-note, and scale buttons
 * [data-scale="linear" | "log"].
 *
 * - Byte counts come from the standards (FIPS 203/204/205, RFC 8032/7748/7919, the Classic
 *   McEliece reference sizes); RSA-2048 counts the bare 2048-bit modulus.
 * - Bars are HTML, not SVG, so labels reflow on a phone; each bar's width is a fraction of
 *   the track minus room for its label.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const SCHEMES = [
    { name: "RSA-2048", family: "factoring", key: 256, second: 256, secondKind: "sig", note: "Signature and ciphertext are both 256 bytes; the key counts only the 2048-bit number." },
    { name: "DH-2048", family: "clock powers", key: 256, second: 256, secondKind: "sent", note: "On a 2048-bit clock (RFC 7919), each side announces a 256-byte hour. That hour is both the public key and the value sent." },
    { name: "Ed25519 / X25519", family: "elliptic curves", key: 32, second: 64, secondKind: "sig", note: "The yardstick: an Ed25519 signature is 64 bytes, an X25519 reply 32." },
    { name: "ML-KEM-768", family: "lattices", key: 1184, second: 1088, secondKind: "ct", note: "Ciphertext 1,088 bytes. Standardized in FIPS 203." },
    { name: "ML-DSA-65", family: "lattices", key: 1952, second: 3309, secondKind: "sig", note: "Signature 3,309 bytes. Standardized in FIPS 204." },
    { name: "SLH-DSA-SHA2-128s", family: "hash-based", key: 32, second: 7856, secondKind: "sig", note: "Signature 7,856 bytes, the smallest SLH-DSA setting in FIPS 205." },
    { name: "Classic McEliece 348864", family: "codes", key: 261120, second: 96, secondKind: "ct", note: "Ciphertext only 96 bytes, but the key is 261,120." },
  ];
  const BASELINE_KEY_BYTES = 32;
  const LOG_MIN_BYTES = 10;
  const LOG_MAX_BYTES = 300000;
  const LOG_TICKS = [10, 100, 1000, 10000, 100000];
  const LINEAR_TICKS = [0, 100000, 200000];
  const KIND_LABEL = { key: "key", sig: "sig", ct: "ct", sent: "sent" };

  const widget = document.getElementById("size-chart-widget");
  const readout = widget.querySelector(".readout");
  const chart = widget.querySelector(".size-chart");
  const axisNote = widget.querySelector(".size-axis-note");
  const scaleButtons = Array.from(widget.querySelectorAll("[data-scale]"));

  let scale = "linear";
  let selectedIndex = 3;

  const maxBytes = Math.max(...SCHEMES.map((scheme) => Math.max(scheme.key, scheme.second)));

  function fraction(bytes) {
    if (scale === "linear") return bytes / maxBytes;
    const logSpan = Math.log10(LOG_MAX_BYTES) - Math.log10(LOG_MIN_BYTES);
    return Math.max(0, (Math.log10(bytes) - Math.log10(LOG_MIN_BYTES)) / logSpan);
  }

  function tickLabel(bytes) {
    if (bytes >= 1000) return `${Trapdoor.formatNumber(bytes / 1000)}k`;
    return String(bytes);
  }

  function barMarkup(bytes, kind) {
    const percent = (fraction(bytes) * 100).toFixed(3);
    return `<span class="size-track">
        <span class="size-bar size-bar-${kind === "key" ? "key" : "second"}" style="--bar-fraction:${percent}"></span>
        <span class="size-value">${KIND_LABEL[kind]} ${Trapdoor.formatNumber(bytes)}</span>
      </span>`;
  }

  function render() {
    const ticks = scale === "linear" ? LINEAR_TICKS : LOG_TICKS;
    const tickMarkup = ticks.map((bytes) => {
      const percent = (scale === "linear" ? bytes / maxBytes : fraction(bytes)) * 100;
      return `<span class="size-tick" style="--bar-fraction:${percent.toFixed(3)}"><span class="size-tick-label">${tickLabel(bytes)}</span></span>`;
    }).join("");

    const rows = SCHEMES.map((scheme, index) => `
      <button type="button" class="size-row" data-index="${index}" aria-pressed="${index === selectedIndex}">
        <span class="size-name">${scheme.name} <span class="size-family">${scheme.family}</span></span>
        ${barMarkup(scheme.key, "key")}
        ${barMarkup(scheme.second, scheme.secondKind)}
      </button>`).join("");

    chart.innerHTML = `<div class="size-ticks" aria-hidden="true">${tickMarkup}</div>${rows}<div class="size-axis"></div>`;
    axisNote.textContent = scale === "linear"
      ? "Bytes, to scale. Most bars are too thin to see: that is the point."
      : "Bytes, log scale: each gridline is ten times the last.";

    chart.querySelectorAll(".size-row").forEach((row) => {
      row.addEventListener("click", () => {
        selectedIndex = Number(row.dataset.index);
        render();
        chart.querySelector(`.size-row[data-index="${selectedIndex}"]`).focus();
      });
    });

    const scheme = SCHEMES[selectedIndex];
    const ratio = scheme.key / BASELINE_KEY_BYTES;
    const comparison = ratio === 1 ? "Same as a curve key." : `${Trapdoor.formatNumber(Math.round(ratio))} times a 32-byte curve key.`;
    readout.innerHTML = `
      <span class="readout-lead">${scheme.name} public key</span>
      <span class="readout-big">${Trapdoor.formatNumber(scheme.key)} bytes</span>
      <span class="readout-detail">${comparison} ${scheme.note}</span>`;

    scaleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.scale === scale));
    });
  }

  scaleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      scale = button.dataset.scale;
      render();
    });
  });

  render();
})();
