/*
 * Merkle tree diagram: eight one-time public keys at the bottom, each pair fingerprinted
 * together, up to one root fingerprint that is the whole public key. Picking a key lights its
 * path to the root and the sibling fingerprints a signature must carry to rebuild that path.
 *
 * Expects #merkle-widget with .merkle-svg, .readout and .widget-controls.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const LEAF_COUNT = 8;
  const LEVEL_COUNT = 4; // 8 leaves, 4, 2, 1 root
  const SVG_WIDTH = 400;
  const SVG_HEIGHT = 236;
  const NODE_WIDTH = 44;
  const NODE_HEIGHT = 32;
  const LEAF_SPACING = SVG_WIDTH / LEAF_COUNT;
  const LEVEL_Y = [196, 136, 76, 20];

  const widget = document.getElementById("merkle-widget");
  const svg = widget.querySelector(".merkle-svg");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");

  /** Center x of node `index` on `level` (0 = leaves): the midpoint of the leaves it covers. */
  function nodeCenterX(level, index) {
    const span = 2 ** level;
    return (index * span + span / 2) * LEAF_SPACING;
  }

  function nodeLabel(level, index) {
    if (level === 0) return `K${index + 1}`;
    if (level === LEVEL_COUNT - 1) return "Root";
    return "";
  }

  /** Path node indexes per level and the sibling index per level below the root. */
  function pathFor(leafIndex) {
    const path = [];
    const siblings = [];
    let index = leafIndex;
    for (let level = 0; level < LEVEL_COUNT; level += 1) {
      path.push(index);
      if (level < LEVEL_COUNT - 1) siblings.push(index ^ 1);
      index >>= 1;
    }
    return { path, siblings };
  }

  function render(chosenKeyNumber) {
    const { path, siblings } = pathFor(chosenKeyNumber - 1);
    svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
    const edges = [];
    const nodes = [];
    for (let level = 0; level < LEVEL_COUNT; level += 1) {
      const nodesOnLevel = LEAF_COUNT / 2 ** level;
      for (let index = 0; index < nodesOnLevel; index += 1) {
        const centerX = nodeCenterX(level, index);
        const centerY = LEVEL_Y[level];
        if (level < LEVEL_COUNT - 1) {
          const parentX = nodeCenterX(level + 1, index >> 1);
          const parentY = LEVEL_Y[level + 1];
          const onPath = path[level] === index;
          edges.push(`<line class="merkle-edge${onPath ? " merkle-edge-path" : ""}" x1="${centerX}" y1="${centerY - NODE_HEIGHT / 2}" x2="${parentX}" y2="${parentY + NODE_HEIGHT / 2}"/>`);
        }
        let role = "";
        if (path[level] === index) role = " merkle-node-path";
        else if (siblings[level] === index) role = " merkle-node-sibling";
        const label = nodeLabel(level, index);
        nodes.push(`<g class="merkle-node${role}">
          <rect x="${centerX - NODE_WIDTH / 2}" y="${centerY - NODE_HEIGHT / 2}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="6"/>
          ${label ? `<text x="${centerX}" y="${centerY + 5}" text-anchor="middle">${label}</text>` : ""}</g>`);
      }
    }
    svg.innerHTML = edges.join("") + nodes.join("");
    svg.setAttribute("aria-label", `A tree of fingerprints with eight one-time keys. Key ${chosenKeyNumber}'s path to the root is highlighted.`);
    readout.innerHTML = `
      <span class="readout-lead">Key ${chosenKeyNumber} signs.</span>
      <span class="readout-detail">The signature carries the ${siblings.length} light blue fingerprints. With them, anyone can rebuild the blue path up to the published root.</span>`;
  }

  const keyStepper = Trapdoor.createStepper({
    container: controls, label: "One-time key", min: 1, max: LEAF_COUNT, value: 3,
    onChange: render,
  });
  render(keyStepper.getValue());
})();
