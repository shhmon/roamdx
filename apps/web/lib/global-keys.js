// App-wide keybindings that should work both inside a session (terminal
// focused) and on the home view. Each binding has a match predicate and
// an action; the action sees no event-context and runs against `App`.
//
// We register a document-level listener for the home-view path. The
// in-session path is handled by terminal.js routing every keydown through
// `handleGlobalKey` before xterm consumes it.

const isPlus  = (e) => e.code === "Equal" || e.code === "NumpadAdd"      || e.key === "+" || e.key === "=";
const isMinus = (e) => e.code === "Minus" || e.code === "NumpadSubtract" || e.key === "-" || e.key === "_";
const isZero  = (e) => e.code === "Digit0" || e.code === "Numpad0"        || e.key === "0";

const list = [
  {
    description: "Ctrl+F — toggle fullscreen",
    match: (e) => e.ctrlKey && !e.shiftKey && (e.key === "f" || e.key === "F"),
    action: (app) => app.toggleFullscreen(),
  },
  {
    description: "Ctrl+Q — back to session list",
    match: (e) => e.ctrlKey && !e.shiftKey && (e.key === "q" || e.key === "Q"),
    action: (app) => app.navigate("/"),
  },
  {
    description: "Ctrl+Shift+R — reload",
    match: (e) => e.ctrlKey && e.shiftKey && (e.key === "r" || e.key === "R"),
    action: () => window.location.reload(),
  },
  {
    description: "Ctrl+, — toggle hardware keyboard mode",
    match: (e) => e.ctrlKey && !e.shiftKey && e.key === ",",
    action: (app) => app.setHwkbMode(localStorage.getItem("roamdx_hwkb") !== "1"),
  },

  // App zoom — Ctrl + / − / 0
  { description: "Ctrl++ — app zoom in",
    match: (e) => e.ctrlKey && !e.shiftKey && isPlus(e),
    action: () => window.TerminalManager?.appZoomIn() },
  { description: "Ctrl+- — app zoom out",
    match: (e) => e.ctrlKey && !e.shiftKey && isMinus(e),
    action: () => window.TerminalManager?.appZoomOut() },
  { description: "Ctrl+0 — app zoom reset",
    match: (e) => e.ctrlKey && !e.shiftKey && isZero(e),
    action: () => window.TerminalManager?.appZoomReset() },

  // Terminal zoom — Ctrl+Shift + / − / 0.
  // On Swedish iOS layouts Shift+= becomes "?" (matched as plus by isPlus
  // because we accept "?"-as-plus is wrong; instead we check the raw codes).
  { description: "Ctrl+Shift++ — term zoom in",
    match: (e) => e.ctrlKey && e.shiftKey && (e.code === "Equal" || e.code === "NumpadAdd" || e.key === "+" || e.key === "?"),
    action: () => window.TerminalManager?.termZoomIn() },
  { description: "Ctrl+Shift+- — term zoom out",
    match: (e) => e.ctrlKey && e.shiftKey && (e.code === "Minus" || e.code === "NumpadSubtract" || e.key === "-" || e.key === "_"),
    action: () => window.TerminalManager?.termZoomOut() },
  { description: "Ctrl+Shift+0 — term zoom reset",
    match: (e) => e.ctrlKey && e.shiftKey && isZero(e),
    action: () => window.TerminalManager?.termZoomReset() },
];

// Returns true if the event matched a binding and was handled.
export function handleGlobalKey(event, app) {
  if (event.type !== "keydown") return false;
  for (const b of list) {
    if (b.match(event)) {
      b.action(app);
      const dbg = document.getElementById("debug-overlay");
      if (dbg) {
        dbg.dataset.lastBinding = b.description;
        dbg.dataset.zooms = `app=${window.TerminalManager?.appZoomPercent?.() ?? "?"}% term=${window.TerminalManager?.termZoomPercent?.() ?? "?"}%`;
      }
      return true;
    }
  }
  return false;
}

export function installGlobalKeys(app) {
  document.addEventListener("keydown", (e) => {
    if (handleGlobalKey(e, app)) e.preventDefault();
  });
}

if (typeof window !== "undefined") {
  window.GlobalKeys = { handleGlobalKey, installGlobalKeys };
}
