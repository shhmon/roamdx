import type { FastifyInstance } from "fastify";
import { ClaudeTaskBody } from "@roamdx/shared";
import { createSession, sendKeys, sendSpecialKey } from "../tmux/bridge.js";
import { parseBody } from "../lib/validate.js";

export async function claudeRoutes(app: FastifyInstance) {
  app.post("/api/claude/task", async (req, reply) => {
    const body = parseBody(req, reply, ClaudeTaskBody);
    if (!body) return;

    const sessionName = `claude-${Date.now().toString(36)}`;
    await createSession(sessionName);

    const escaped = body.prompt.replace(/'/g, "'\\''");
    await sendKeys(sessionName, `claude '${escaped}'`);
    await sendSpecialKey(sessionName, "Enter");

    return { status: "sent", sessionId: sessionName };
  });
}
