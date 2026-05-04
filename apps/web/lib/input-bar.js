// Input bar controller. Owns the bar's visibility and its sticky modifier
// state. Modifiers are armed by tapping; the next physical key (from soft
// or hardware keyboard) consumes them.
//
// Esc is a key, not a modifier — sends \x1b immediately.
// Tab and the modifiers (Shift/Ctrl) all participate in the arming flow.

const ESC = "\x1b";
const TAB = "\x09";

export function createInputBar({ bar, paneBar, terminalManager, body }) {
  const armed = { shift: false, ctrl: false };

  function setArmed(mod, on) {
    armed[mod] = on;
    const btn = bar.querySelector(`[data-action="${mod}"]`);
    if (btn) btn.classList.toggle("armed", on);
  }

  function clearArmed() {
    setArmed("shift", false);
    setArmed("ctrl", false);
  }

  function applyToData(data) {
    // Single-char keys: convert with armed modifiers, then clear.
    if (data.length !== 1) {
      // Multi-byte sequences (e.g. arrow keys) — pass through. Clearing
      // modifiers is still right, since the user "spent" the chord.
      clearArmed();
      return data;
    }
    let out = data;
    if (armed.ctrl) {
      const c = out.toLowerCase().charCodeAt(0) - 96;
      if (c > 0 && c < 27) out = String.fromCharCode(c);
    }
    if (armed.shift) {
      // For letters: uppercase. Other shifted symbols are typically already
      // typed in their shifted form by the keyboard — leave alone.
      const ch = out;
      if (ch >= "a" && ch <= "z") out = ch.toUpperCase();
    }
    clearArmed();
    return out;
  }

  function isArmed() {
    return armed.shift || armed.ctrl;
  }

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.preventDefault();
    const action = btn.dataset.action;
    if (action === "esc") {
      terminalManager.send({ type: "input", data: ESC });
      clearArmed();
    } else if (action === "tab") {
      const data = applyToData(TAB);
      terminalManager.send({ type: "input", data });
    } else if (action === "shift") {
      setArmed("shift", !armed.shift);
    } else if (action === "ctrl") {
      setArmed("ctrl", !armed.ctrl);
    }
    // Hand focus back to the terminal so the next physical keypress goes
    // straight in (and so armed modifiers can apply on the very next key).
    terminalManager.term?.focus();
  });

  function show() {
    bar.classList.remove("hidden");
    paneBar?.classList.remove("hidden");
    body.classList.add("input-bar-open");
    terminalManager.scheduleRefit?.();
  }
  function hide() {
    bar.classList.add("hidden");
    paneBar?.classList.add("hidden");
    body.classList.remove("input-bar-open");
    clearArmed();
    terminalManager.scheduleRefit?.();
  }
  function toggle() {
    bar.classList.contains("hidden") ? show() : hide();
  }
  function visible() {
    return !bar.classList.contains("hidden");
  }

  return { show, hide, toggle, visible, isArmed, applyToData, clearArmed };
}

if (typeof window !== "undefined") {
  window.InputBar = { createInputBar };
}
