import type { FastifyInstance } from "fastify";
import { listSessions, createSession, killSession, capturePane } from "../tmux/bridge.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/api/sessions", async () => {
    const sessions = await listSessions();
    return { sessions };
  });

  app.get<{ Params: { name: string } }>(
    "/api/sessions/:name/preview",
    async (req, reply) => {
      try {
        const content = await capturePane(req.params.name);
        return { content };
      } catch {
        return reply.status(404).send({ error: "Session not found" });
      }
    }
  );

  app.post<{ Body: { name: string; cols?: number; rows?: number } }>(
    "/api/sessions",
    async (req, reply) => {
      const { name, cols, rows } = req.body;
      if (!name || typeof name !== "string") {
        return reply.status(400).send({ error: "name is required" });
      }
      await createSession(name, cols, rows);
      return reply.status(201).send({ ok: true });
    }
  );

  app.delete<{ Params: { name: string } }>(
    "/api/sessions/:name",
    async (req, reply) => {
      await killSession(req.params.name);
      return reply.status(200).send({ ok: true });
    }
  );
}
