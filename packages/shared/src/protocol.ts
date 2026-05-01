import type { TmuxSession } from "./types.js";

// Client -> Server
export type ClientMessage =
  | { type: "attach"; sessionId: string; cols?: number; rows?: number }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "detach" };

// Server -> Client
export type ServerMessage =
  | { type: "output"; data: string }
  | { type: "attached"; session: Pick<TmuxSession, "name"> }
  | { type: "error"; message: string };
