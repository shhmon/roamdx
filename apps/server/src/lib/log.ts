// Lightweight logger. Fastify owns request logs; this is for app-level
// modules (tmux bridge, pty manager) that aren't tied to a request.

type Fields = Record<string, unknown>;

function fmt(level: string, msg: string, fields?: Fields): string {
  const entry: Fields = { level, time: Date.now(), msg, ...fields };
  return JSON.stringify(entry);
}

export const log = {
  info(msg: string, fields?: Fields) {
    console.log(fmt("info", msg, fields));
  },
  warn(msg: string, fields?: Fields) {
    console.warn(fmt("warn", msg, fields));
  },
  error(msg: string, fields?: Fields) {
    console.error(fmt("error", msg, fields));
  },
};
