import type { FastifyInstance } from "fastify";
import {
  SendKeysBody,
  SendSpecialBody,
  WaitUntilBody,
  EnsureSessionBody,
} from "@roamdx/shared";
import * as roamer from "../agent/roamer.js";
import { parseBody } from "../lib/validate.js";

export async function agentRoutes(app: FastifyInstance) {
  app.get("/api/agent/sessions", async () => {
    return { sessions: await roamer.listSessions() };
  });

  app.get<{ Params: { name: string }; Querystring: { tail?: string; raw?: string } }>(
    "/api/agent/sessions/:name/pane",
    async (req, reply) => {
      const tail = req.query.tail !== undefined ? parseInt(req.query.tail, 10) : undefined;
      const raw = req.query.raw === "true" || req.query.raw === "1";
      try {
        const content = await roamer.readPane(req.params.name, { tail, raw });
        return { content };
      } catch (err) {
        req.log.warn({ err, name: req.params.name }, "readPane failed");
        return reply.status(404).send({ error: "Session not found" });
      }
    },
  );

  app.post<{ Params: { name: string } }>(
    "/api/agent/sessions/:name/keys",
    async (req, reply) => {
      const body = parseBody(req, reply, SendKeysBody);
      if (!body) return;
      await roamer.sendKeys(req.params.name, body.text);
      return { ok: true };
    },
  );

  app.post<{ Params: { name: string } }>(
    "/api/agent/sessions/:name/special",
    async (req, reply) => {
      const body = parseBody(req, reply, SendSpecialBody);
      if (!body) return;
      await roamer.sendSpecial(req.params.name, body.key);
      return { ok: true };
    },
  );

  app.post<{ Params: { name: string } }>(
    "/api/agent/sessions/:name/wait",
    async (req, reply) => {
      const body = parseBody(req, reply, WaitUntilBody);
      if (!body) return;
      let regex: RegExp;
      try {
        regex = new RegExp(body.pattern, body.flags ?? "");
      } catch (err) {
        return reply.status(400).send({ error: `Invalid regex: ${err}` });
      }
      const matched = await roamer.waitUntil(req.params.name, regex, {
        timeoutMs: body.timeoutMs,
        pollMs: body.pollMs,
      });
      return { matched };
    },
  );

  app.post("/api/agent/sessions", async (req, reply) => {
    const body = parseBody(req, reply, EnsureSessionBody);
    if (!body) return;
    const created = await roamer.ensureSession(body.name);
    return { created };
  });
}
