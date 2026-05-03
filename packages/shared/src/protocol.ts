import * as v from "valibot";

// ── WebSocket: client → server ──

export const AttachMessage = v.object({
  type: v.literal("attach"),
  sessionId: v.string(),
  cols: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  rows: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const InputMessage = v.object({
  type: v.literal("input"),
  data: v.string(),
});

export const ResizeMessage = v.object({
  type: v.literal("resize"),
  cols: v.pipe(v.number(), v.integer(), v.minValue(1)),
  rows: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const DetachMessage = v.object({
  type: v.literal("detach"),
});

export const WakeMessage = v.object({
  type: v.literal("wake"),
});

export const ClientMessageSchema = v.variant("type", [
  AttachMessage,
  InputMessage,
  ResizeMessage,
  DetachMessage,
  WakeMessage,
]);

export type ClientMessage = v.InferOutput<typeof ClientMessageSchema>;

// ── WebSocket: server → client ──
// Server messages are produced by us, so we only need types (no runtime parsing).

export type ServerMessage =
  | { type: "output"; data: string }
  | { type: "attached"; session: { name: string } }
  | { type: "error"; message: string };

// ── REST request bodies ──

export const CreateSessionBody = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  cols: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  rows: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const RenameSessionBody = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
});

export const ClaudeTaskBody = v.object({
  prompt: v.pipe(v.string(), v.minLength(1)),
});
