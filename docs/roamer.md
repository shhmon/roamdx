# Roamer

A small HTTP API + CLI that lets an external agent drive tmux sessions.

## CLI

| Command                                                      | What it does                                       |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `roamer list`                                                | List sessions (name, command, cwd)                 |
| `roamer pane <name> [--tail N] [--raw]`                      | Read current pane content. Strips ANSI by default. |
| `roamer keys <name> <text...>`                               | Type literal text                                  |
| `roamer special <name> <key>`                                | Send a special key (Enter, Escape, C-c, Up, ...)   |
| `roamer wait <name> <pattern> [--timeout 10000] [--flags i]` | Block until regex matches; exits 3 on timeout      |
| `roamer ensure <name>`                                       | Create the session if it doesn't exist             |

## Typical flow

```sh
roamer ensure logs
roamer keys logs "tail -f /tmp/server.log"
roamer special logs Enter
roamer wait logs "ready" --timeout 5000
roamer pane logs --tail 20
```

## REST API

Same operations, gated by `Authorization: Bearer $ROAMDX_TOKEN`:

| Route                                                | Body                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `GET /api/agent/sessions`                            | —                                                        |
| `GET /api/agent/sessions/:name/pane?tail=N&raw=true` | —                                                        |
| `POST /api/agent/sessions/:name/keys`                | `{ "text": "..." }`                                      |
| `POST /api/agent/sessions/:name/special`             | `{ "key": "Enter" }`                                     |
| `POST /api/agent/sessions/:name/wait`                | `{ "pattern": "...", "flags": "i", "timeoutMs": 10000 }` |
| `POST /api/agent/sessions`                           | `{ "name": "..." }`                                      |

## Notes

- Special key names follow tmux's syntax: `Enter`, `Escape`, `Tab`, `Space`, `Up`, `Down`, `Left`, `Right`, `C-c`, `C-d`, `M-x`, `F1`–`F12`.
- `keys` is literal — no escape sequence interpretation. Send special keys via `special`.
- `wait` polls `pane` every 200ms (configurable via the API). Use it to gate "send command, then wait for prompt before reading output."
