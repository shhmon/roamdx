import type { TmuxSession } from "./types.js";

// Client → Server
export type ClientMessage =
  | { type: "attach"; sessionId: string }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "detach" };

// Server → Client
export type ServerMessage =
  | { type: "output"; data: string }
  | { type: "attached"; session: TmuxSession }
  | { type: "error"; message: string }
  | { type: "sessions"; sessions: TmuxSession[] };
