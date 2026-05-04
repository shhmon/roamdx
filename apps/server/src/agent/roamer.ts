// Roamer: agent-facing tool layer over tmux sessions.
//
// These functions are the contract anything (claude-code, voice, curl) uses
// to drive sessions. Keep the surface small — reading and writing keys is
// 80% of what an external agent actually needs.

import {
  listSessions as bridgeList,
  capturePane,
  sendKeys as bridgeSendKeys,
  sendSpecialKey,
  hasSession,
  createSession,
} from "../tmux/bridge.js";
import { log } from "../lib/log.js";

const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;

/** List all sessions (passthrough to tmux bridge). */
export async function listSessions() {
  return bridgeList();
}

/**
 * Read the current contents of a session's pane.
 * Strips ANSI escapes by default; set `raw: true` to keep them.
 * Use `tail` to limit to the last N non-empty lines.
 */
export async function readPane(
  session: string,
  opts: { tail?: number; raw?: boolean } = {},
): Promise<string> {
  const out = await capturePane(session);
  let text = opts.raw ? out : out.replace(ANSI_RE, "");
  if (opts.tail !== undefined) {
    const lines = text.split("\n");
    // Drop trailing blank lines, then take last N.
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    text = lines.slice(-opts.tail).join("\n");
  }
  return text;
}

/** Type literal text into a session (no parsing of tmux/escape sequences). */
export async function sendKeys(session: string, text: string): Promise<void> {
  await bridgeSendKeys(session, text);
}

/**
 * Send a special key (tmux key name): Enter, Escape, C-c, Up, etc.
 * See `man tmux` for the full list. Common ones:
 *   Enter, Escape, Tab, Space, Up, Down, Left, Right,
 *   C-c (Ctrl+C), C-d, C-z, M-x (Alt+x), F1..F12
 */
export async function sendSpecial(session: string, key: string): Promise<void> {
  await sendSpecialKey(session, key);
}

/**
 * Block until `pattern` appears in the pane content, or timeout.
 * Useful after sending a command to wait for a prompt or specific output.
 *
 * @returns true if matched, false if timed out.
 */
export async function waitUntil(
  session: string,
  pattern: RegExp,
  opts: { timeoutMs?: number; pollMs?: number } = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const pollMs = opts.pollMs ?? 200;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const text = await readPane(session);
      if (pattern.test(text)) return true;
    } catch (err) {
      log.warn("roamer.waitUntil read failed", { session, err: String(err) });
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

/**
 * Convenience: ensure a session exists (creates it if not).
 * Returns true if a new session was created.
 */
export async function ensureSession(name: string): Promise<boolean> {
  if (await hasSession(name)) return false;
  await createSession(name);
  return true;
}
