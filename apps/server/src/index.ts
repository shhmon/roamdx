import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { sessionRoutes } from "./routes/sessions.js";
import { claudeRoutes } from "./routes/claude.js";
import { statusRoutes } from "./routes/status.js";
import { uploadRoutes } from "./routes/upload.js";
import { handleConnection } from "./ws/handler.js";
import { shutdown } from "./pty/manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

await app.register(fastifyCors);
await app.register(fastifyMultipart, { limits: { fileSize: 20 * 1024 * 1024 } });

// Auth hook
app.addHook("onRequest", async (req, reply) => {
  const url = req.url;
  if (url === "/api/status" || (!url.startsWith("/api/") && !url.startsWith("/ws"))) {
    return;
  }
  if (url.startsWith("/ws")) {
    const token = new URL(req.url, `http://${req.hostname}`).searchParams.get("token");
    if (token !== config.token) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ") || auth.slice(7) !== config.token) {
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

// REST
await app.register(statusRoutes);
await app.register(sessionRoutes);
await app.register(claudeRoutes);
await app.register(uploadRoutes);

// Static files
const webRoot = join(__dirname, "../../web");
await app.register(fastifyStatic, {
  root: webRoot,
  prefix: "/",
});

// SPA fallback — serve index.html for page routes (no extension, not API/WS)
app.setNotFoundHandler(async (req, reply) => {
  const url = req.url.split("?")[0];
  if (url.startsWith("/api/") || url.startsWith("/ws") || url.includes(".")) {
    return reply.status(404).send({ error: "Not found" });
  }
  return reply.sendFile("index.html");
});

// Graceful shutdown
const stop = async () => {
  shutdown();
  await app.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await app.listen({ port: config.port, host: config.host });
