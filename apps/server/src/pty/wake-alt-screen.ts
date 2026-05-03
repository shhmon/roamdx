import type * as pty from "node-pty";

// SIGWINCH wake-up for alt-screen TUIs.
//
// Problem: when we attach to a tmux session whose foreground process is in
// alt-screen mode (claude-code, vim, htop, etc.), the new client gets blank
// output until *something* triggers a redraw. Tmux only repaints on dirty
// state; alt-screen apps only repaint on input or SIGWINCH. There is no tmux
// command that asks the foreground app to repaint.
//
// Solution: resize the pty cols off-by-one and back. The two SIGWINCHes
// propagate through tmux to the foreground app, forcing a redraw. POSIX
// SIGWINCH is the only portable mechanism here.
//
// Tuning: 150ms outer delay = wait for tmux's attach handshake. 80ms gap
// between the two resizes = let the app finish its first repaint cycle
// before the second nudge (a too-short gap leaves the screen mid-paint).
//
// See: research notes in conversation history; ttyd/code-server hit the
// same issue and ship the same workaround.

const ATTACH_HANDSHAKE_MS = 150;
const REPAINT_GAP_MS = 80;

export function wakeAltScreen(proc: pty.IPty, cols: number, rows: number): void {
  setTimeout(() => {
    try {
      proc.resize(Math.max(2, cols - 1), rows);
      setTimeout(() => {
        try { proc.resize(cols, rows); } catch {}
      }, REPAINT_GAP_MS);
    } catch {}
  }, ATTACH_HANDSHAKE_MS);
}
