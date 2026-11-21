/*
 * The landing map on index.html: the four arcs, each with its chapter cards, built from
 * Trapdoor.ARCS, Trapdoor.CHAPTERS (chapters.js) and Trapdoor.GLYPHS (chapter-glyphs.js).
 *
 * Markup contract: <div class="map" id="chapter-map"> holding a plain <ol> of chapter links.
 * The plain list is the no-JS fallback; this script replaces it with the arc sections.
 *
 * - Chapter 1's card is the one emphasized card ("Start here").
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor || {};
  const map = document.getElementById("chapter-map");
  if (!map || !Trapdoor.ARCS || !Trapdoor.CHAPTERS) return;
  const glyphs = Trapdoor.GLYPHS || {};

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildCard(chapter) {
    const item = element("li", "map-item");
    const card = element("a", chapter.number === 1 ? "map-card map-card-start" : "map-card");
    card.href = `chapters/${chapter.slug}.html`;
    const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    glyph.setAttribute("viewBox", "0 0 64 64");
    glyph.setAttribute("class", "map-glyph");
    glyph.setAttribute("aria-hidden", "true");
    glyph.innerHTML = glyphs[chapter.slug] || "";
    const text = element("span", "map-text");
    if (chapter.number === 1) text.appendChild(element("span", "map-start", "Start here"));
    const title = element("span", "map-title");
    title.append(element("span", "map-number", String(chapter.number)), document.createTextNode(chapter.title));
    text.append(title, element("span", "map-hook", chapter.hook));
    card.append(glyph, text);
    item.appendChild(card);
    return item;
  }

  const sections = Trapdoor.ARCS.map((arc, arcIndex) => {
    const section = element("section", "arc");
    const headingId = `arc-${arc.id}`;
    section.setAttribute("aria-labelledby", headingId);
    const heading = element("h2", "arc-heading");
    heading.id = headingId;
    heading.append(element("span", "arc-number", `Part ${arcIndex + 1}`), document.createTextNode(arc.name));
    const list = element("ol", "map-list");
    const chapters = Trapdoor.CHAPTERS.filter((chapter) => chapter.arc === arc.id);
    list.start = chapters[0].number;
    chapters.forEach((chapter) => list.appendChild(buildCard(chapter)));
    section.append(heading, element("p", "arc-line", arc.line), list);
    return section;
  });
  map.replaceChildren(...sections);
})();
