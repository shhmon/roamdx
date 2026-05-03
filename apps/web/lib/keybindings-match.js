// Pure keybinding matcher. Given a KeyboardEvent-shaped object, returns
// the binding's id (string) if any matches, else null. Actions are wired
// at call site — this module is just the pattern.

const TMUX_PREFIX = "\x02";

// Returns { bindingId, send } where `send` is an array of strings to write
// to the pty in order. Action wiring happens in keybindings.js (browser).
export function matchKeybinding(e) {
  if (!e || e.type !== "keydown") return null;

  // Shift+arrow scroll
  if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === "ArrowUp") return { id: "scroll-up" };
    if (e.key === "ArrowDown") return { id: "scroll-down" };
  }

  // Ctrl/Ctrl+Shift letter combos
  const k = e.key && e.key.toLowerCase();
  if (e.ctrlKey && !e.shiftKey) {
    if (k === "d") return { id: "split-right" };
    if (k === "w") return { id: "close-pane" };
  }
  if (e.ctrlKey && e.shiftKey) {
    if (k === "d") return { id: "split-down" };
    if (k === "h") return { id: "focus-left" };
    if (k === "j") return { id: "focus-down" };
    if (k === "k") return { id: "focus-up" };
    if (k === "l") return { id: "focus-right" };
    if (e.key === "Enter") return { id: "zoom" };
  }
  return null;
}

export { TMUX_PREFIX };

if (typeof window !== "undefined") {
  window.KeybindingsMatch = { matchKeybinding, TMUX_PREFIX };
}
