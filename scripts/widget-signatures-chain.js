/*
 * Certificate chain figure: root authority signs an intermediate, which signs the website's
 * certificate, which earns the padlock. Drawn once as SVG; nothing moves.
 *
 * Expects #chain-figure containing svg.chain-svg.
 *
 * - Cards stack top to bottom (root first) so the figure reads the same on a phone and a laptop.
 * - Colors come from classes in chapter-signatures.css.
 */
(function () {
  "use strict";

  const { createSvgElement } = window.Trapdoor.signatures;

  const VIEWBOX_WIDTH = 360;
  const VIEWBOX_HEIGHT = 432;
  const CARD_X = 8;
  const CARD_WIDTH = VIEWBOX_WIDTH - 2 * CARD_X;
  const CARD_HEIGHT = 92;
  const CARD_GAP = 64;
  const TEXT_INSET = 18;

  const CHAIN_CARDS = [
    { title: "Root authority", detail: "Its public key came built into", detailSecond: "your browser or phone.", kind: "root" },
    { title: "Intermediate authority", detail: "Its public key, signed by", detailSecond: "the root.", kind: "middle" },
    { title: "yourbank.com", detail: "The site's name and public key,", detailSecond: "signed by the intermediate.", kind: "site" },
  ];

  const chainSvg = document.querySelector("#chain-figure .chain-svg");
  chainSvg.setAttribute("viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);

  const definitions = createSvgElement("defs", {});
  const arrowMarker = createSvgElement("marker", {
    id: "chain-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto",
  });
  arrowMarker.appendChild(createSvgElement("path", { d: "M0 0 L10 5 L0 10 z", class: "chain-arrowhead" }));
  definitions.appendChild(arrowMarker);
  chainSvg.appendChild(definitions);

  function addText(x, y, content, className, extra = {}) {
    const text = createSvgElement("text", { x, y, class: className, ...extra });
    text.textContent = content;
    chainSvg.appendChild(text);
  }

  /** A closed padlock: rounded body plus a shackle arc, drawn at (x, y) top-left. */
  function drawPadlock(x, y) {
    const group = createSvgElement("g", { class: "chain-padlock", transform: `translate(${x} ${y})` });
    group.appendChild(createSvgElement("path", { d: "M8 20 V12 a10 10 0 0 1 20 0 V20", class: "chain-padlock-shackle" }));
    group.appendChild(createSvgElement("rect", { x: 2, y: 19, width: 32, height: 26, rx: 5, class: "chain-padlock-body" }));
    group.appendChild(createSvgElement("circle", { cx: 18, cy: 31, r: 3.5, class: "chain-padlock-hole" }));
    chainSvg.appendChild(group);
  }

  CHAIN_CARDS.forEach((card, cardIndex) => {
    const top = cardIndex * (CARD_HEIGHT + CARD_GAP) + 4;
    chainSvg.appendChild(createSvgElement("rect", {
      x: CARD_X, y: top, width: CARD_WIDTH, height: CARD_HEIGHT, rx: 10, class: `chain-card chain-card-${card.kind}`,
    }));
    addText(CARD_X + TEXT_INSET, top + 32, card.title, "chain-title");
    addText(CARD_X + TEXT_INSET, top + 57, card.detail, "chain-detail");
    addText(CARD_X + TEXT_INSET, top + 77, card.detailSecond, "chain-detail");
    if (card.kind === "site") drawPadlock(CARD_X + CARD_WIDTH - 52, top + 22);

    if (cardIndex < CHAIN_CARDS.length - 1) {
      const arrowTop = top + CARD_HEIGHT + 6;
      const arrowX = VIEWBOX_WIDTH / 2 - 60;
      chainSvg.appendChild(createSvgElement("line", {
        x1: arrowX, y1: arrowTop, x2: arrowX, y2: arrowTop + CARD_GAP - 14,
        class: "chain-arrow", "marker-end": "url(#chain-arrow)",
      }));
      addText(arrowX + 14, arrowTop + CARD_GAP / 2 + 2, "signs", "chain-arrow-label", { "dominant-baseline": "central" });
    }
  });

  chainSvg.setAttribute("aria-label",
    "A chain of three certificates. The root authority, built into your browser, signs the intermediate authority. " +
    "The intermediate signs yourbank.com's certificate, which earns the padlock.");
})();
