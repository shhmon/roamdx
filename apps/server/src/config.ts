import * as v from "valibot";
import { DEFAULT_PORT } from "@roamdx/shared";

const ConfigSchema = v.object({
  port: v.pipe(
    v.optional(v.string(), String(DEFAULT_PORT)),
    v.transform((s) => parseInt(s, 10)),
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(65535),
  ),
  token: v.pipe(v.string(), v.minLength(8, "ROAMDX_TOKEN must be at least 8 chars")),
  host: v.optional(v.string(), "0.0.0.0"),
  tmuxBin: v.optional(v.string(), "tmux"),
});

const result = v.safeParse(ConfigSchema, {
  port: process.env.PORT,
  token: process.env.ROAMDX_TOKEN,
  host: process.env.HOST,
  tmuxBin: process.env.TMUX_BIN,
});

if (!result.success) {
  const issue = result.issues[0];
  const path = issue.path?.map((p) => p.key).join(".") ?? "config";
  console.error(`[config] ${path}: ${issue.message}`);
  console.error("[config] Set ROAMDX_TOKEN in your .env (min 8 chars).");
  process.exit(1);
}

export const config = result.output;
