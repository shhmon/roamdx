import type { FastifyInstance } from "fastify";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const UPLOAD_DIR = join(homedir(), ".roamdx", "uploads");
const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".gif"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_EDGE = 1600;
const JPEG_QUALITY = 80;

// sips can't re-encode animated GIFs without flattening; leave them alone.
const SKIP_COMPRESS = new Set([".gif"]);
// HEIC/HEIF can't be opened by most tools, so always convert to JPEG.
const FORCE_CONVERT = new Set([".heic", ".heif"]);

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
    const baseName = `${Date.now()}-${id}`;
    const srcPath = join(UPLOAD_DIR, `${baseName}${ext}`);
    await writeFile(srcPath, buffer);

    if (SKIP_COMPRESS.has(ext)) {
      return { path: srcPath, filename: `${baseName}${ext}` };
    }

    const outExt = FORCE_CONVERT.has(ext) ? ".jpg" : ext;
    const outPath = join(UPLOAD_DIR, `${baseName}${outExt}`);

    try {
      const args = ["-Z", String(MAX_EDGE)];
      if (outExt === ".jpg" || outExt === ".jpeg") {
        args.push("-s", "format", "jpeg", "-s", "formatOptions", String(JPEG_QUALITY));
      }
      args.push(srcPath, "--out", outPath);
      await exec("sips", args);

      if (outPath !== srcPath) await unlink(srcPath);
      return { path: outPath, filename: `${baseName}${outExt}` };
    } catch (err) {
      req.log.error({ err }, "image compression failed");
      return { path: srcPath, filename: `${baseName}${ext}` };
    }
  });
}
