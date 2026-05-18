export function enhanceDateInputs(root = document) {
  root.querySelectorAll("input[type='date']").forEach((input) => {
    input.addEventListener("click", () => openDatePicker(input));
    input.addEventListener("focus", () => openDatePicker(input));
  });
}

function openDatePicker(input) {
  if (typeof input.showPicker === "function" && !input.disabled) {
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }
}
