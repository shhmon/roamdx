// Keybinding table: keystroke → action
// Actions are functions that receive the TerminalManager instance.
//
// Keystroke encoding (xterm.js sends these via onData):
//   Shift+Up    \x1b[1;2A    Shift+Down  \x1b[1;2B
//   Ctrl+Shift+Up    \x1b[1;6A
//   Ctrl+Shift+H/J/K/L  \x08/\n/\x0b/\x0c (just Ctrl) — see below
//
// For Ctrl+Shift+letter, xterm.js sends the same bytes as Ctrl+letter
// (because Ctrl strips the shift bit). To distinguish, we need
// attachCustomKeyEventHandler which sees the raw KeyboardEvent.

const TMUX_PREFIX = "\x02"; // Ctrl+B (default tmux prefix)

const sendTmuxCommand = (tm, ...keys) => {
  for (const k of keys) {
    tm.send({ type: "input", data: k });
  }
};

const scrollLine = (tm, up) => {
  const btn = up ? 96 : 97;
  tm.send({ type: "input", data: `\x1b[M${String.fromCharCode(btn)}\x21\x21` });
};

// Bindings keyed by KeyboardEvent properties, evaluated in attachCustomKeyEventHandler.
// Each entry: { match: (e) => bool, action: (tm) => void, description }
const Keybindings = {
  list: [
    // Scroll
    {
      description: "Shift+Up — scroll up one line",
      match: (e) => e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowUp",
      action: (tm) => scrollLine(tm, true),
    },
    {
      description: "Shift+Down — scroll down one line",
      match: (e) => e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowDown",
      action: (tm) => scrollLine(tm, false),
    },

    // Pane splits (Ctrl+Shift+D for split-down)
    {
      description: "Ctrl+Shift+D — split pane horizontally (down)",
      match: (e) => e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d"),
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, '"'),
    },

    // Pane navigation
    {
      description: "Ctrl+Shift+H — focus pane left",
      match: (e) => e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h"),
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, "h"),
    },
    {
      description: "Ctrl+Shift+J — focus pane down",
      match: (e) => e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j"),
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, "j"),
    },
    {
      description: "Ctrl+Shift+K — focus pane up",
      match: (e) => e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k"),
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, "k"),
    },
    {
      description: "Ctrl+Shift+L — focus pane right",
      match: (e) => e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l"),
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, "l"),
    },

    // Pane zoom toggle
    {
      description: "Ctrl+Shift+Enter — toggle pane zoom",
      match: (e) => e.ctrlKey && e.shiftKey && e.key === "Enter",
      action: (tm) => sendTmuxCommand(tm, TMUX_PREFIX, "z"),
    },
  ],

  // Returns true if the event was handled (and should be suppressed).
  handle(event, terminalManager) {
    if (event.type !== "keydown") return false;
    for (const binding of this.list) {
      if (binding.match(event)) {
        binding.action(terminalManager);
        return true;
      }
    }
    return false;
  },
};
