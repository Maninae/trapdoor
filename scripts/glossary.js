/*
 * Glossary popups: tap a dotted-underlined term to open a short note under its paragraph.
 *
 * Markup contract:
 *     <button type="button" class="term" aria-controls="note-mod" aria-expanded="false">mod</button>
 *     <aside class="term-note" id="note-mod" hidden> ... <button class="term-note-close"> </aside>
 *
 * - Tap or click only (no hover), so it behaves the same on a phone and a laptop.
 * - One note open at a time; Escape or the close button shuts it and returns focus to the term.
 */
(function () {
  "use strict";

  const termButtons = Array.from(document.querySelectorAll("button.term"));

  function noteFor(termButton) {
    return document.getElementById(termButton.getAttribute("aria-controls"));
  }

  function closeNote(termButton, { returnFocus }) {
    termButton.setAttribute("aria-expanded", "false");
    noteFor(termButton).hidden = true;
    if (returnFocus) termButton.focus();
  }

  function openNote(termButton) {
    termButtons.forEach((other) => {
      if (other !== termButton && other.getAttribute("aria-expanded") === "true") {
        closeNote(other, { returnFocus: false });
      }
    });
    termButton.setAttribute("aria-expanded", "true");
    noteFor(termButton).hidden = false;
  }

  termButtons.forEach((termButton) => {
    termButton.addEventListener("click", () => {
      if (termButton.getAttribute("aria-expanded") === "true") {
        closeNote(termButton, { returnFocus: false });
      } else {
        openNote(termButton);
      }
    });
    const closeButton = noteFor(termButton).querySelector(".term-note-close");
    closeButton.addEventListener("click", () => closeNote(termButton, { returnFocus: true }));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openTerm = termButtons.find((button) => button.getAttribute("aria-expanded") === "true");
    if (openTerm) closeNote(openTerm, { returnFocus: true });
  });
})();
