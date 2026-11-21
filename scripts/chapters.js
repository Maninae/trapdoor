/*
 * The one source of truth for the site's chapters: order, number, title, hook, and arc.
 *
 * Read by chapter-nav.js (previous / next at the bottom of each chapter) and landing.js
 * (the map on index.html). Plain data, no DOM work, safe to load on any page.
 *
 * - `slug` is the file name in chapters/ without ".html".
 * - `title` matches the page's <h1>; `hook` is one line, no em-dashes.
 * - Adding a chapter also means: its page header number, the plain fallback list in
 *   index.html, sitemap.xml, and a glyph in chapter-glyphs.js (see CLAUDE.md).
 */
(function () {
  "use strict";

  const Trapdoor = (window.Trapdoor = window.Trapdoor || {});

  Trapdoor.ARCS = [
    { id: "shared-secrets", name: "Shared secrets", line: "Codes for two people who already share a key." },
    { id: "strangers", name: "Strangers", line: "Talking safely with someone you have never met." },
    { id: "curves", name: "Curves", line: "The same trick with much smaller keys." },
    { id: "after-quantum", name: "After quantum", line: "What survives a quantum computer." },
  ];

  Trapdoor.CHAPTERS = [
    { slug: "secret-codes", number: 1, arc: "shared-secrets", title: "Secret codes",
      hook: "Spin a cipher wheel, then crack a code by counting letters." },
    { slug: "scrambling", number: 2, arc: "shared-secrets", title: "The blender",
      hook: "Bits, XOR, and a fingerprint that changes completely when one letter does." },
    { slug: "clock-math", number: 3, arc: "strangers", title: "Clock math",
      hook: "Numbers that wrap around, and a calculation that only runs one way." },
    { slug: "shared-secret", number: 4, arc: "strangers", title: "A secret in plain sight",
      hook: "Two strangers agree on a secret while everyone listens." },
    { slug: "two-keys", number: 5, arc: "strangers", title: "Two keys",
      hook: "A lock anyone can close but only you can open." },
    { slug: "signatures", number: 6, arc: "strangers", title: "Signatures",
      hook: "Prove who sent a message, and see how your browser trusts a website." },
    { slug: "curves", number: 7, arc: "curves", title: "Hopping on a curve",
      hook: "Add points on a curve, then try to count the hops backward." },
    { slug: "quantum", number: 8, arc: "after-quantum", title: "The rhythm finder",
      hook: "How a quantum computer would hear the hidden rhythm and break today's keys." },
    { slug: "lattices", number: 9, arc: "after-quantum", title: "Lost in the grid",
      hook: "Find the nearest dot in a grid when all you have are the wrong arrows." },
    { slug: "hash-signatures", number: 10, arc: "after-quantum", title: "Signatures from the blender",
      hook: "Sign with nothing but fingerprints, one key per message." },
    { slug: "big-picture", number: 11, arc: "after-quantum", title: "The big picture",
      hook: "Every family side by side: sizes, hard problems, and what quantum does to each." },
  ];
})();
