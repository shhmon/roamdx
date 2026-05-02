# RoamDX — Plan

## Vision

Remote access layer for a home dev machine. Any client (iPad, phone, laptop) connects in different modes:

1. **Terminal mode** — full interactive terminal via browser
2. **Assistant mode** — send tasks to Claude Code, watch it work
3. **Voice mode** — speak to Claude, hear responses
4. **Dashboard mode** — visual overview of workspaces and sessions

## What's done

### Infrastructure
- [x] Fastify server with WebSocket + REST API
- [x] tmux session management (create, list, rename, delete)
- [x] node-pty bridge — spawns `tmux attach` for real terminal streaming
- [x] Bearer token auth on all endpoints
- [x] Tailscale for private network access
- [x] SPA routing with pushState (`/`, `/session/:name`)
- [x] Makefile for dev/start/stop/restart

### Terminal mode (Mode A)
- [x] xterm.js with full color/cursor support
- [x] Ghostty tinkermon theme matched
- [x] JetBrainsMono Nerd Font
- [x] Resize sync between browser and tmux
- [x] Fullscreen toggle
- [x] Mobile layout with helper key bar (Esc, Tab, Ctrl, arrows)
- [x] Reconnection with exponential backoff

### Assistant mode (Mode B)
- [x] Claude quick panel — type a prompt, spawns `claude 'prompt'` in a new tmux session
- [x] Auto-attaches terminal to watch Claude work
- [x] Each task gets its own session (`claude-<id>`)

### Home view
- [x] Session grid with pixelated color previews
- [x] Create/delete/rename sessions
- [x] Session metadata (dimensions, last activity time)
- [x] Sorted by last activity
- [x] New session tile (+)

## What's next

### Voice input (now)
- [ ] Mic button in Claude panel (and/or floating in terminal view)
- [ ] Web Speech API for speech-to-text (runs on client device mic)
- [ ] Transcript → send as Claude task
- [ ] Visual feedback: recording state, transcript preview

### Assistant mode improvements
- [ ] Persistent Claude session — reuse one session for follow-up prompts instead of spawning new ones each time
- [ ] Activity detection — poll capture-pane to detect when Claude is idle vs working
- [ ] "Claude finished" notification via Web Notifications API
- [ ] Clean output extraction — parse Claude Code's terminal output to separate responses from tool use noise

### Voice mode (Phase 2)
- [ ] Full voice loop: speak → Claude → hear response
- [ ] STT: Web Speech API (free) or Deepgram (paid, more accurate)
- [ ] TTS: ElevenLabs or OpenAI TTS API for natural voice output
- [ ] Brain: Claude API directly (not Claude Code) for clean text responses
- [ ] Handoff: voice conversation can trigger Claude Code tasks ("fix the auth tests" → spawns CC session)
- [ ] Wake word or push-to-talk button

### Dashboard mode (Phase 3)
- [ ] Smart workspaces — one tap launches a tmux layout with specific cwd + tools
- [ ] Workspace templates: frontend, backend, trading, music
- [ ] Session summaries — second model summarizes noisy terminal logs
- [ ] Activity feed across all sessions

### Security hardening
- [ ] Rate limiting on API endpoints
- [ ] Read-only client mode
- [ ] Command approval prompts (optional)
- [ ] Audit log

### Mobile polish
- [ ] Fix mobile keys bar positioning with virtual keyboard
- [ ] Better touch targets
- [ ] Swipe gestures (back to home, switch sessions)
