import type { FastifyInstance } from "fastify";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const UPLOAD_DIR = join(homedir(), ".roamdx", "uploads");
const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadRoutes(app: FastifyInstance) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  app.post("/api/upload", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.status(400).send({ error: "no file" });
    }

    const ext = extname(file.filename || "").toLowerCase();
    if (!ALLOWED.has(ext)) {
      return reply.status(400).send({ error: `unsupported type: ${ext}` });
    }

    const buffer = await file.toBuffer();
    if (buffer.length > MAX_SIZE) {
      return reply.status(413).send({ error: "file too large" });
    }

    const id = randomBytes(6).toString("hex");
    const filename = `${Date.now()}-${id}${ext}`;
    const path = join(UPLOAD_DIR, filename);
    await writeFile(path, buffer);

    // Convert HEIC to PNG (macOS sips) — most tools can't read HEIC
    if (ext === ".heic") {
      const pngPath = path.replace(/\.heic$/, ".png");
      try {
        await exec("sips", ["-s", "format", "png", path, "--out", pngPath]);
        await unlink(path);
        return { path: pngPath, filename: pngPath.split("/").pop() };
      } catch (err) {
        req.log.error({ err }, "heic conversion failed");
        // Fall through and return the original heic
      }
    }

    return { path, filename };
  });
}
