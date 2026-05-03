import type { WebSocket } from "ws";
import * as v from "valibot";
import { ClientMessageSchema, DEFAULT_COLS, DEFAULT_ROWS } from "@roamdx/shared";
import { hasSession } from "../tmux/bridge.js";
import { attachToSession, detachClient, writeInput, resizeSession } from "../pty/manager.js";

export function handleConnection(ws: WebSocket) {
  let attachedSession: string | null = null;

  ws.on("message", async (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const result = v.safeParse(ClientMessageSchema, parsed);
    if (!result.success) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message shape" }));
      return;
    }
    const msg = result.output;

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
        attachToSession(msg.sessionId, ws, msg.cols ?? DEFAULT_COLS, msg.rows ?? DEFAULT_ROWS);
        ws.send(JSON.stringify({ type: "attached", session: { name: msg.sessionId } }));
        break;
      }

      case "input": {
        if (!attachedSession) {
          ws.send(JSON.stringify({ type: "error", message: "Not attached" }));
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
