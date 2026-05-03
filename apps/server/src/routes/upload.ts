import type { FastifyInstance } from "fastify";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import heicConvert from "heic-convert";

const UPLOAD_DIR = join(homedir(), ".roamdx", "uploads");
const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".gif"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_EDGE = 1600;
const JPEG_QUALITY = 80;

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

    // Animated GIFs: leave alone (re-encoding would flatten frames).
    if (ext === ".gif") {
      const path = join(UPLOAD_DIR, `${baseName}${ext}`);
      await writeFile(path, buffer);
      return { path, filename: `${baseName}${ext}` };
    }

    try {
      // HEIC/HEIF: most tools can't read it. Convert to JPEG buffer first,
      // then run sharp on the result for resize + quality control.
      let input = buffer;
      let outExt = ext;
      if (ext === ".heic" || ext === ".heif") {
        // heic-convert's @types says ArrayBufferLike, but the underlying
        // heic-decode actually wants something with iterable .slice — a
        // Buffer/Uint8Array works, a plain ArrayBuffer does not.
        const converted = await heicConvert({
          buffer: buffer as unknown as ArrayBufferLike,
          format: "JPEG",
          quality: 1,
        });
        input = Buffer.from(converted);
        outExt = ".jpg";
      }

      const isJpeg = outExt === ".jpg" || outExt === ".jpeg";
      const pipeline = sharp(input).rotate().resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      });
      const out = isJpeg
        ? await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
        : await pipeline.toBuffer();

      const path = join(UPLOAD_DIR, `${baseName}${outExt}`);
      await writeFile(path, out);
      return { path, filename: `${baseName}${outExt}` };
    } catch (err) {
      req.log.error({ err, ext }, "image processing failed; storing original");
      const path = join(UPLOAD_DIR, `${baseName}${ext}`);
      await writeFile(path, buffer);
      return { path, filename: `${baseName}${ext}` };
    }
  });
}
