/*
 * Adding and multiplying on a clock: do the ordinary arithmetic, then wrap.
 *
 * Expects #arithmetic-widget containing .dial, .readout, .widget-controls, and
 * .operation-toggle buttons with data-operation="add" | "multiply".
 * For addition the dial draws the clockwise walk from the first number; when either
 * input is past the clock size, a second line shows that wrapping first lands in the same spot.
 */
(function () {
  "use strict";

  const Trapdoor = window.Trapdoor;
  const MAX_OPERAND = 999;
  const OPERATION_SYMBOL = {
    add: "+",
    multiply: "×",
  };

  const widget = document.getElementById("arithmetic-widget");
  const dialSvg = widget.querySelector(".dial");
  const readout = widget.querySelector(".readout");
  const controls = widget.querySelector(".widget-controls");
  const operationButtons = widget.querySelectorAll(".operation-toggle button");

  let currentOperation = "add";

  function combine(left, right, operation) {
    return operation === "add" ? BigInt(left) + BigInt(right) : BigInt(left) * BigInt(right);
  }

  function update() {
    const hours = hoursStepper.getValue();
    const firstNumber = firstStepper.getValue();
    const secondNumber = secondStepper.getValue();
    const symbol = OPERATION_SYMBOL[currentOperation];

    const ordinaryResult = combine(firstNumber, secondNumber, currentOperation);
    const landing = Trapdoor.wrap(ordinaryResult, hours);
    const firstLanding = Number(Trapdoor.wrap(firstNumber, hours));
    const secondLanding = Number(Trapdoor.wrap(secondNumber, hours));

    const marks = { [firstLanding]: "start" };
    marks[Number(landing)] = "landed";
    Trapdoor.renderDial(dialSvg, {
      hours,
      marks,
      arc: currentOperation === "add" ? { fromHour: firstLanding, steps: secondLanding } : null,
    });
    dialSvg.setAttribute(
      "aria-label",
      `A ${hours}-hour clock. ${firstNumber} ${symbol} ${secondNumber} lands on ${landing}.`,
    );

    let wrapFirstLine = "";
    if (firstNumber >= hours || secondNumber >= hours) {
      const smallResult = combine(firstLanding, secondLanding, currentOperation);
      wrapFirstLine = `<span class="readout-detail">Wrap first: ${firstLanding} ${symbol} ${secondLanding} = ${smallResult}, which also lands on ${landing}.</span>`;
    }

    readout.innerHTML = `
      <span class="readout-lead">${firstNumber} ${symbol} ${secondNumber} = ${ordinaryResult}, which lands on</span>
      <span class="readout-big">${landing}</span>
      ${wrapFirstLine}`;
  }

  const hoursStepper = Trapdoor.createStepper({
    container: controls, label: "Hours on the clock", min: 5, max: 30, value: 12, onChange: update,
  });
  const firstStepper = Trapdoor.createStepper({
    container: controls, label: "First number", min: 0, max: MAX_OPERAND, value: 9, onChange: update,
  });
  const secondStepper = Trapdoor.createStepper({
    container: controls, label: "Second number", min: 0, max: MAX_OPERAND, value: 5, onChange: update,
  });

  operationButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentOperation = button.dataset.operation;
      operationButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      update();
    });
  });

  update();
})();
