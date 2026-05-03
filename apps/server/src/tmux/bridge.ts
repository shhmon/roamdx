import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { TmuxSession } from "@roamdx/shared";
import { DEFAULT_COLS, DEFAULT_ROWS } from "@roamdx/shared";
import { log } from "../lib/log.js";
import { config } from "../config.js";

const exec = promisify(execFile);

// Default cwd for new sessions: ~/dev if it exists, else $HOME.
function defaultSessionCwd(): string {
  const home = process.env.HOME || "/";
  const dev = join(home, "dev");
  return existsSync(dev) ? dev : home;
}

function sanitizeName(name: string): string {
  return name.replace(/[.:]/g, "-").slice(0, 64);
}

// "no server running" is expected when tmux hasn't been started — not an error.
function isNoServer(err: unknown): boolean {
  const msg = (err as { stderr?: string; message?: string })?.stderr ??
    (err as { message?: string })?.message ?? "";
  return /no server running/i.test(msg);
}

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await exec(config.tmuxBin, args);
  return stdout;
}

export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const out = await tmux(
      "list-sessions",
      "-F",
      "#{session_name}|#{session_activity}|#{window_width}|#{window_height}|#{session_attached}|#{pane_current_command}|#{pane_current_path}"
    );
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, created, cols, rows, attached, command, path] = line.split("|");
        return {
          name,
          created,
          cols: parseInt(cols, 10),
          rows: parseInt(rows, 10),
          attached: parseInt(attached, 10),
          command: command || "",
          path: path || "",
        };
      });
  } catch (err) {
    if (!isNoServer(err)) log.error("tmux list-sessions failed", { err: String(err) });
    return [];
  }
}

export async function createSession(
  name: string,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS
): Promise<void> {
  const safe = sanitizeName(name);
  await tmux(
    "new-session", "-d", "-s", safe,
    "-x", String(cols), "-y", String(rows),
    "-c", defaultSessionCwd(),
  );
}

export async function renameSession(oldName: string, newName: string): Promise<void> {
  await tmux("rename-session", "-t", sanitizeName(oldName), sanitizeName(newName));
}

export async function killSession(name: string): Promise<void> {
  await tmux("kill-session", "-t", sanitizeName(name));
}

export async function hasSession(name: string): Promise<boolean> {
  try {
    await tmux("has-session", "-t", sanitizeName(name));
    return true;
  } catch (err) {
    // tmux exits 1 when the session doesn't exist — that's the expected "no" path.
    // Only log if it's something else (e.g. tmux binary missing).
    const msg = (err as { stderr?: string })?.stderr ?? "";
    if (!/can't find session/i.test(msg) && !isNoServer(err)) {
      log.error("tmux has-session failed", { name, err: String(err) });
    }
    return false;
  }
}

export async function capturePane(session: string): Promise<string> {
  return tmux("capture-pane", "-t", sanitizeName(session), "-p", "-e");
}

export async function sendKeys(session: string, keys: string): Promise<void> {
  await tmux("send-keys", "-t", sanitizeName(session), "-l", keys);
}

export async function sendSpecialKey(session: string, key: string): Promise<void> {
  await tmux("send-keys", "-t", sanitizeName(session), key);
}
