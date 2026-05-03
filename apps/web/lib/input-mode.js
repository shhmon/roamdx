// Helpers for inputs that should respect hardware-keyboard mode.
// When the user has hwkb mode enabled, we suppress the iOS soft keyboard
// and accessory bar by setting `inputmode="none"`.
//
// Usage:
//   const input = createHwkbInput("tile-rename");        // makes a fresh <input>
//   applyHwkbMode(existingEl);                            // applies to existing
//
// The mode is stored in localStorage under "roamdx_hwkb"; the toggle in the
// FAB menu writes it. This helper just reads.

const HWKB_KEY = "roamdx_hwkb";

export function isHwkbOn() {
  return localStorage.getItem(HWKB_KEY) === "1";
}

export function applyHwkbMode(el, on = isHwkbOn()) {
  if (!el) return;
  if (on) el.setAttribute("inputmode", "none");
  else el.removeAttribute("inputmode");
}

export function createHwkbInput(className) {
  const input = document.createElement("input");
  if (className) input.className = className;
  // iOS defaults that are wrong for technical names (sessions, paths, etc).
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");
  applyHwkbMode(input);
  return input;
}

if (typeof window !== "undefined") {
  window.InputMode = { isHwkbOn, applyHwkbMode, createHwkbInput };
}
