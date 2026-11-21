/*
 * Opening lattice widget: two arrows A and B, and every dot you can reach by whole numbers of
 * steps along each. Switching between the tidy pair and the skewed pair keeps the same dot lit
 * and rewrites its recipe, which shows the two pairs build exactly the same grid.
 *
 * Expects #lattice-grid-widget with .lattice-svg, .readout, .widget-controls and the pair
 * toggle buttons [data-basis="tidy" | "skewed"].
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const Lattice = Trapdoor.Lattice;
  const MAX_STEPS = 30;

  const widget = document.getElementById("lattice-grid-widget");
  const svg = widget.querySelector(".lattice-svg");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");
  const basisButtons = Array.from(widget.querySelectorAll("[data-basis]"));

  let basis = Lattice.TIDY;
  let recipe = { coefA: 1, coefB: 1 };

  const stepperA = Trapdoor.createStepper({
    container: controls, label: "Steps along A", min: -MAX_STEPS, max: MAX_STEPS, value: recipe.coefA,
    onChange(value) { recipe.coefA = value; render(); },
  });
  const stepperB = Trapdoor.createStepper({
    container: controls, label: "Steps along B", min: -MAX_STEPS, max: MAX_STEPS, value: recipe.coefB,
    onChange(value) { recipe.coefB = value; render(); },
  });

  function render() {
    const landing = Lattice.combine(basis, recipe.coefA, recipe.coefB);
    Lattice.drawScene(svg, { basis, showDots: true, recipe });
    const pairName = basis === Lattice.TIDY ? "tidy" : "skewed";
    svg.setAttribute("aria-label", `A grid of dots with the ${pairName} arrows A and B drawn from the center dot.`);
    const where = Lattice.isInView(landing)
      ? `lands on the dot at (${landing.x}, ${landing.y})`
      : `lands at (${landing.x}, ${landing.y}), off the page`;
    readout.innerHTML = `
      <span class="readout-lead">${Lattice.recipeText(recipe)}</span>
      <span class="readout-detail">${where}. Switch pairs: the same dot stays lit, with a new recipe.</span>`;
    basisButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.basis === basis.name));
    });
  }

  basisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextBasis = button.dataset.basis === "tidy" ? Lattice.TIDY : Lattice.SKEWED;
      if (nextBasis === basis) return;
      const landing = Lattice.combine(basis, recipe.coefA, recipe.coefB);
      const nextRecipe = Lattice.coefficientsOf(nextBasis, landing);
      basis = nextBasis;
      // det of the change of pair is 1, so the new recipe is whole numbers.
      recipe = { coefA: Math.round(nextRecipe.coefA), coefB: Math.round(nextRecipe.coefB) };
      stepperA.setValue(recipe.coefA);
      stepperB.setValue(recipe.coefB);
      recipe = { coefA: stepperA.getValue(), coefB: stepperB.getValue() };
      render();
    });
  });

  render();
})();
