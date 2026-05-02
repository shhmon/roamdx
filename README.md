# RoamDX

Remote access layer for a home dev machine. Connect from any device (iPad, phone, laptop) and get a full terminal in the browser — with tmux persistence, Claude Code integration, and voice input.

## How it works

```
Browser (xterm.js)  <-->  WebSocket  <-->  Fastify server  <-->  node-pty  <-->  tmux sessions
```

The server runs on your home machine. It spawns `tmux attach` via node-pty for each session, piping the raw terminal byte stream over WebSocket to xterm.js in the browser. Input goes back the same way. No polling, no screen scraping — it's a direct PTY pipe.

Sessions are tmux sessions under the hood, so they persist across server restarts and can be inspected manually via `tmux attach`.

## Features

- **Full terminal** — colors, cursor shapes, vim, Claude Code, TUI apps all work
- **Session management** — create, rename, delete tmux sessions from the UI
- **Home view** — session grid with pixelated color previews and metadata
- **Claude quick panel** — type a prompt, spawns Claude Code in a new session
- **Voice input** — speak a command via Web Speech API, text gets typed into the terminal
- **Mobile support** — togglable helper key bar (Esc, Tab, Ctrl, arrows), fullscreen mode
- **Tailscale** — private encrypted access from anywhere, no port forwarding
- **Token auth** — bearer token on all API and WebSocket endpoints

## Setup

```bash
# Install dependencies
make install

# Create a .env file
cp .env.example .env
# Edit .env — set ROAMDX_TOKEN to something secure

# Run in foreground
make dev

# Or run in background
make start
```

Open `http://localhost:3001` (or your Tailscale IP).

## Commands

| Command | What it does |
|---------|-------------|
| `make dev` | Run in foreground |
| `make start` | Run in background |
| `make stop` | Stop the server |
| `make restart` | Stop + start |
| `make logs` | Tail the log file |
| `make status` | Check if running |
| `make typecheck` | Run tsc |

Override port or token: `make start PORT=3000 TOKEN=mysecret`

## Architecture

```
apps/
  server/         # Fastify + WebSocket + node-pty
    src/
      pty/        # node-pty manager (spawns tmux attach)
      tmux/       # tmux CLI bridge (create, list, rename, kill sessions)
      routes/     # REST endpoints (sessions, claude, status)
      ws/         # WebSocket handler
  web/            # Static frontend
    js/           # app, terminal, auth, api, preview, voice, claude-panel
    css/          # Vanilla CSS, Ghostty tinkermon theme
    fonts/        # JetBrainsMono Nerd Font (served to clients)
packages/
  shared/         # TypeScript types and constants
```

## Requirements

- Node.js
- tmux
- pnpm
- Tailscale (for remote access)
