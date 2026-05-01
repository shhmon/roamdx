import type { WebSocket } from "ws";
import type { ClientMessage } from "@roamdx/shared";
import { sendKeys, sendSpecialKey, resizeWindow, hasSession, listSessions } from "../tmux/bridge.js";
import { addClient, removeClient } from "../tmux/stream-manager.js";

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
          removeClient(attachedSession, ws);
        }
        const exists = await hasSession(msg.sessionId);
        if (!exists) {
          ws.send(JSON.stringify({ type: "error", message: `Session "${msg.sessionId}" not found` }));
          return;
        }
        attachedSession = msg.sessionId;
        addClient(msg.sessionId, ws);

        const sessions = await listSessions();
        const session = sessions.find((s) => s.name === msg.sessionId);
        if (session) {
          ws.send(JSON.stringify({ type: "attached", session }));
        }
        break;
      }

      case "input": {
        if (!attachedSession) {
          ws.send(JSON.stringify({ type: "error", message: "Not attached to any session" }));
          return;
        }
        await sendKeys(attachedSession, msg.data);
        break;
      }

      case "resize": {
        if (!attachedSession) return;
        await resizeWindow(attachedSession, msg.cols, msg.rows);
        break;
      }

      case "detach": {
        if (attachedSession) {
          removeClient(attachedSession, ws);
          attachedSession = null;
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    if (attachedSession) {
      removeClient(attachedSession, ws);
    }
  });
}
