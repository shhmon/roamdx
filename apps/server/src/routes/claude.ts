import type { FastifyInstance } from "fastify";
import { hasSession, createSession, sendKeys, sendSpecialKey } from "../tmux/bridge.js";

export async function claudeRoutes(app: FastifyInstance) {
  app.post<{ Body: { prompt: string } }>(
    "/api/claude/task",
    async (req, reply) => {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return reply.status(400).send({ error: "prompt is required" });
      }

      const sessionName = "claude";
      if (!(await hasSession(sessionName))) {
        await createSession(sessionName);
      }

      await sendKeys(sessionName, prompt);
      await sendSpecialKey(sessionName, "Enter");

      return { status: "sent", sessionId: sessionName };
    }
  );
}
