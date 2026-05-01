import type { WebSocket } from "ws";
import type { ServerMessage } from "@roamdx/shared";
import { POLL_INTERVAL_MS } from "@roamdx/shared";
import { capturePane } from "./bridge.js";

interface SessionStream {
  sessionId: string;
  clients: Set<WebSocket>;
  lastContent: string;
  interval: ReturnType<typeof setInterval> | null;
}

const streams = new Map<string, SessionStream>();

function broadcast(stream: SessionStream, msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const ws of stream.clients) {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  }
}

function startPolling(stream: SessionStream) {
  if (stream.interval) return;
  stream.interval = setInterval(async () => {
    try {
      const content = await capturePane(stream.sessionId);
      if (content !== stream.lastContent) {
        stream.lastContent = content;
        broadcast(stream, { type: "output", data: content });
      }
    } catch {
      broadcast(stream, { type: "error", message: "Failed to capture pane" });
    }
  }, POLL_INTERVAL_MS);
}

function stopPolling(stream: SessionStream) {
  if (stream.interval) {
    clearInterval(stream.interval);
    stream.interval = null;
  }
}

export function addClient(sessionId: string, ws: WebSocket) {
  let stream = streams.get(sessionId);
  if (!stream) {
    stream = { sessionId, clients: new Set(), lastContent: "", interval: null };
    streams.set(sessionId, stream);
  }
  stream.clients.add(ws);
  startPolling(stream);

  // Send current content immediately
  capturePane(sessionId)
    .then((content) => {
      stream!.lastContent = content;
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "output", data: content } satisfies ServerMessage));
      }
    })
    .catch(() => {});
}

export function removeClient(sessionId: string, ws: WebSocket) {
  const stream = streams.get(sessionId);
  if (!stream) return;
  stream.clients.delete(ws);
  if (stream.clients.size === 0) {
    stopPolling(stream);
    streams.delete(sessionId);
  }
}

export function shutdown() {
  for (const stream of streams.values()) {
    stopPolling(stream);
  }
  streams.clear();
}
