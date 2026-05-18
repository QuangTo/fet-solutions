export function showDialog(dialog, focusTarget = null) {
  dialog.hidden = false;
  focusTarget?.focus();
  focusTarget?.select?.();
}

export function hideDialog(dialog) {
  dialog.hidden = true;
}

export function bindDialogDismiss({ dialog, cancelButton, onDismiss }) {
  cancelButton?.addEventListener("click", onDismiss);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      onDismiss();
    }
  });
}
