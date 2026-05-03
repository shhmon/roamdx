import type { FastifyInstance } from "fastify";
import { CreateSessionBody, RenameSessionBody } from "@roamdx/shared";
import { listSessions, createSession, killSession, renameSession, capturePane } from "../tmux/bridge.js";
import { parseBody } from "../lib/validate.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/api/sessions", async () => {
    const sessions = await listSessions();
    sessions.sort((a, b) => parseInt(b.created) - parseInt(a.created));
    return { sessions };
  });

  app.get<{ Params: { name: string } }>(
    "/api/sessions/:name/preview",
    async (req, reply) => {
      try {
        const content = await capturePane(req.params.name);
        return { content };
      } catch (err) {
        req.log.warn({ err, name: req.params.name }, "capturePane failed");
        return reply.status(404).send({ error: "Session not found" });
      }
    }
  );

  app.post<{ Params: { name: string } }>(
    "/api/sessions/:name/rename",
    async (req, reply) => {
      const body = parseBody(req, reply, RenameSessionBody);
      if (!body) return;
      try {
        await renameSession(req.params.name, body.name);
        return { ok: true };
      } catch (err) {
        req.log.warn({ err, from: req.params.name, to: body.name }, "renameSession failed");
        return reply.status(404).send({ error: "Session not found or rename failed" });
      }
    }
  );

  app.post("/api/sessions", async (req, reply) => {
    const body = parseBody(req, reply, CreateSessionBody);
    if (!body) return;
    await createSession(body.name, body.cols, body.rows);
    return reply.status(201).send({ ok: true });
  });

  app.delete<{ Params: { name: string } }>(
    "/api/sessions/:name",
    async (req, reply) => {
      await killSession(req.params.name);
      return reply.status(200).send({ ok: true });
    }
  );
}
