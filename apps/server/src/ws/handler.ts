import type { WebSocket } from "ws";
import type { ClientMessage } from "@roamdx/shared";
import { DEFAULT_COLS, DEFAULT_ROWS } from "@roamdx/shared";
import { hasSession } from "../tmux/bridge.js";
import { attachToSession, detachClient, writeInput, resizeSession } from "../pty/manager.js";

export function handleConnection(ws: WebSocket) {
  let attachedSession: string | null = null;

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      return;
    }

    switch (msg.type) {
      case "attach": {
        if (attachedSession) {
          detachClient(attachedSession, ws);
        }
        const exists = await hasSession(msg.sessionId);
        if (!exists) {
          ws.send(JSON.stringify({ type: "error", message: `Session "${msg.sessionId}" not found` }));
          return;
        }
        attachedSession = msg.sessionId;
        const cols = (msg as any).cols || DEFAULT_COLS;
        const rows = (msg as any).rows || DEFAULT_ROWS;
        attachToSession(msg.sessionId, ws, cols, rows);
        ws.send(JSON.stringify({ type: "attached", session: { name: msg.sessionId } }));
        break;
      }

      case "input": {
        if (!attachedSession) {
          ws.send(JSON.stringify({ type: "error", message: "Not attached to any session" }));
          return;
        }
        writeInput(attachedSession, msg.data);
        break;
      }

      case "resize": {
        if (!attachedSession) return;
        resizeSession(attachedSession, msg.cols, msg.rows);
        break;
      }

      case "detach": {
        if (attachedSession) {
          detachClient(attachedSession, ws);
          attachedSession = null;
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    if (attachedSession) {
      detachClient(attachedSession, ws);
    }
  });
}
