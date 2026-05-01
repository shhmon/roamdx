import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyBearerAuth from "@fastify/bearer-auth";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { sessionRoutes } from "./routes/sessions.js";
import { claudeRoutes } from "./routes/claude.js";
import { statusRoutes } from "./routes/status.js";
import { handleConnection } from "./ws/handler.js";
import { shutdown } from "./tmux/stream-manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

// CORS
await app.register(fastifyCors);

// Auth — skip for status and static assets
const keys = new Set([config.token]);
await app.register(fastifyBearerAuth, {
  keys,
  addHook: false,
});

app.addHook("onRequest", async (req, reply) => {
  const url = req.url;
  // Skip auth for status, static files, and websocket upgrade
  if (
    url === "/api/status" ||
    !url.startsWith("/api/") && !url.startsWith("/ws")
  ) {
    return;
  }
  // For WebSocket, check token in query string
  if (url.startsWith("/ws")) {
    const token = new URL(req.url, `http://${req.hostname}`).searchParams.get("token");
    if (token !== config.token) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return;
  }
  // For API routes, check bearer token
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ") || !keys.has(auth.slice(7))) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

// WebSocket
await app.register(fastifyWebsocket);
app.register(async (app) => {
  app.get("/ws", { websocket: true }, (socket) => {
    handleConnection(socket);
  });
});

// REST routes
await app.register(statusRoutes);
await app.register(sessionRoutes);
await app.register(claudeRoutes);

// Static files — serve web frontend
const webDir = join(__dirname, "../../web");
await app.register(fastifyStatic, {
  root: webDir,
  prefix: "/",
});

// Graceful shutdown
const stop = async () => {
  shutdown();
  await app.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// Start
await app.listen({ port: config.port, host: config.host });
console.log(`roamdx server running on http://${config.host}:${config.port}`);
