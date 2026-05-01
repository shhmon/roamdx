import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TmuxSession } from "@roamdx/shared";
import { DEFAULT_COLS, DEFAULT_ROWS } from "@roamdx/shared";

const exec = promisify(execFile);

function sanitizeName(name: string): string {
  return name.replace(/[.:]/g, "-").slice(0, 64);
}

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await exec("tmux", args);
  return stdout;
}

export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const out = await tmux(
      "list-sessions",
      "-F",
      "#{session_name}|#{session_created}|#{window_width}|#{window_height}|#{session_attached}"
    );
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, created, cols, rows, attached] = line.split("|");
        return {
          name,
          created,
          cols: parseInt(cols, 10),
          rows: parseInt(rows, 10),
          attached: parseInt(attached, 10),
        };
      });
  } catch {
    return [];
  }
}

export async function createSession(
  name: string,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS
): Promise<void> {
  const safe = sanitizeName(name);
  await tmux("new-session", "-d", "-s", safe, "-x", String(cols), "-y", String(rows));
}

export async function killSession(name: string): Promise<void> {
  await tmux("kill-session", "-t", sanitizeName(name));
}

export async function hasSession(name: string): Promise<boolean> {
  try {
    await tmux("has-session", "-t", sanitizeName(name));
    return true;
  } catch {
    return false;
  }
}

export async function sendKeys(session: string, keys: string): Promise<void> {
  await tmux("send-keys", "-t", sanitizeName(session), "-l", keys);
}

export async function sendSpecialKey(session: string, key: string): Promise<void> {
  await tmux("send-keys", "-t", sanitizeName(session), key);
}
