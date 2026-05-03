// App-wide keybindings that should work both inside a session (terminal
// focused) and on the home view. Each binding has a match predicate and
// an action; the action sees no event-context and runs against `App`.
//
// We register a document-level listener for the home-view path. The
// in-session path is handled by terminal.js routing every keydown through
// `handleGlobalKey` before xterm consumes it.

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
];

// Returns true if the event matched a binding and was handled.
export function handleGlobalKey(event, app) {
  if (event.type !== "keydown") return false;
  for (const b of list) {
    if (b.match(event)) {
      b.action(app);
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
