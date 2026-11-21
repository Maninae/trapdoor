/*
 * Previous / next chapter cards at the bottom of a chapter page, built from Trapdoor.CHAPTERS.
 *
 * Markup contract (static, so the page still works without JS):
 *     <nav class="chapter-nav" aria-label="Chapters">
 *       <p class="chapter-nav-all"><a href="../index.html">All chapters</a></p>
 *     </nav>
 *
 * - The current chapter is found from the file name in the URL (works from disk and on Pages).
 * - The first chapter gets only a next card, the last only a previous card.
 * - Load after chapters.js.
 */
(function () {
  "use strict";

  const chapters = (window.Trapdoor || {}).CHAPTERS;
  const nav = document.querySelector(".chapter-nav");
  if (!chapters || !nav) return;

  const fileName = window.location.pathname.split("/").pop().replace(/\.html$/, "");
  const index = chapters.findIndex((chapter) => chapter.slug === fileName);
  if (index === -1) return;

  function buildCard(chapter, direction) {
    const card = document.createElement("a");
    card.className = `chapter-nav-card chapter-nav-${direction}`;
    card.href = `${chapter.slug}.html`;
    card.rel = direction;
    const kicker = document.createElement("span");
    kicker.className = "chapter-nav-kicker";
    kicker.textContent = direction === "next" ? `Next: chapter ${chapter.number} →` : `← Chapter ${chapter.number}`;
    const title = document.createElement("span");
    title.className = "chapter-nav-title";
    title.textContent = chapter.title;
    const hook = document.createElement("span");
    hook.className = "chapter-nav-hook";
    hook.textContent = chapter.hook;
    card.append(kicker, title, hook);
    return card;
  }

  const pair = document.createElement("div");
  pair.className = "chapter-nav-pair";
  if (index > 0) pair.appendChild(buildCard(chapters[index - 1], "prev"));
  if (index < chapters.length - 1) pair.appendChild(buildCard(chapters[index + 1], "next"));
  nav.prepend(pair);
})();
