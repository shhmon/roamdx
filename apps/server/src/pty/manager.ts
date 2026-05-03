import * as pty from "node-pty";
import type { WebSocket } from "ws";
import { log } from "../lib/log.js";
import { config } from "../config.js";

interface PtyAttachment {
  proc: pty.IPty;
  clients: Set<WebSocket>;
}

// One pty per (session, WebSocket) would be wasteful.
// Instead: one pty ("tmux attach") per tmux session, shared by all WS clients.
const attachments = new Map<string, PtyAttachment>();

export function attachToSession(
  sessionId: string,
  ws: WebSocket,
  cols: number,
  rows: number
): void {
  let att = attachments.get(sessionId);

  if (!att) {
    let proc: pty.IPty;
    try {
      const env = { ...process.env } as Record<string, string>;
      // Ensure homebrew/local bins are in PATH so node-pty can resolve tmux
      // and tools spawned by the user shell (claude, fzf, etc).
      env.PATH = `/opt/homebrew/bin:/usr/local/bin:${env.PATH || ""}`;
      proc = pty.spawn(config.tmuxBin, ["attach", "-t", sessionId], {
        name: "xterm-256color",
        cols,
        rows,
        cwd: process.env.HOME || "/",
        env,
      });
    } catch (err) {
      log.error("pty spawn failed", { sessionId, err: String(err) });
      ws.send(JSON.stringify({ type: "error", message: `Failed to attach: ${err}` }));
      return;
    }

    att = { proc, clients: new Set() };
    attachments.set(sessionId, att);

    proc.onData((data) => {
      const msg = JSON.stringify({ type: "output", data });
      for (const client of att!.clients) {
        if (client.readyState === 1) {
          client.send(msg);
        }
      }
    });

    proc.onExit(({ exitCode, signal }) => {
      log.info("pty exited", { sessionId, exitCode, signal, clients: att!.clients.size });
      const msg = JSON.stringify({ type: "error", message: `Session "${sessionId}" ended` });
      for (const client of att!.clients) {
        if (client.readyState === 1) client.send(msg);
      }
      attachments.delete(sessionId);
    });
  } else {
    att.proc.resize(cols, rows);
  }

  att.clients.add(ws);
}

export function detachClient(sessionId: string, ws: WebSocket): void {
  const att = attachments.get(sessionId);
  if (!att) return;
  att.clients.delete(ws);

  if (att.clients.size === 0) {
    // No more clients — kill the tmux attach process (not the session itself)
    att.proc.kill();
    attachments.delete(sessionId);
  }
}

export function writeInput(sessionId: string, data: string): void {
  const att = attachments.get(sessionId);
  if (!att) return;
  att.proc.write(data);
}

export function resizeSession(sessionId: string, cols: number, rows: number): void {
  const att = attachments.get(sessionId);
  if (!att) return;
  att.proc.resize(cols, rows);
}

export function shutdown(): void {
  for (const att of attachments.values()) {
    att.proc.kill();
  }
  attachments.clear();
}
