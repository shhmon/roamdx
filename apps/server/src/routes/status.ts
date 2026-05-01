import type { FastifyInstance } from "fastify";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/api/status", async () => {
    return { status: "ok", uptime: process.uptime() };
  });
}
