const App = {
  sessions: [],
  activeSession: null,
  pollTimer: null,
  initialized: false,

  async init() {
    if (!Auth.isAuthenticated() || this.initialized) return;
    this.initialized = true;

    TerminalManager.init();
    ClaudePanel.init();

    document.getElementById("new-session-btn").addEventListener("click", () => this.createSession());
    document.getElementById("new-session-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.createSession();
    });

    document.getElementById("logo").addEventListener("click", () => {
      if (this.activeSession) {
        TerminalManager.detach();
        this.activeSession = null;
        this.showHome();
        this.updateSessions(this.sessions);
      }
    });

    document.getElementById("fullscreen-btn").addEventListener("click", () => this.enterFullscreen());
    document.getElementById("exit-fullscreen").addEventListener("click", () => this.exitFullscreen());

    this.showHome();

    await this.refreshSessions();
    this.pollTimer = setInterval(() => this.refreshSessions(), 5000);
  },

  showHome() {
    document.getElementById("home-view").classList.remove("hidden");
    document.getElementById("terminal-container").style.display = "none";
    this.renderHomeGrid();
  },

  showTerminal() {
    document.getElementById("home-view").classList.add("hidden");
    document.getElementById("terminal-container").style.display = "";
    setTimeout(() => TerminalManager.fitAddon.fit(), 10);
  },

  renderHomeGrid() {
    const grid = document.getElementById("home-grid");
    grid.innerHTML = "";

    for (const s of this.sessions) {
      const tile = document.createElement("div");
      tile.className = "home-tile";

      const name = document.createElement("span");
      name.className = "tile-name";
      name.textContent = s.name;

      const meta = document.createElement("div");
      meta.className = "tile-meta";
      const created = new Date(parseInt(s.created) * 1000);
      const ago = this.timeAgo(created);
      meta.innerHTML = `<span>${s.cols}x${s.rows}</span><span>${ago}</span>`;

      tile.appendChild(name);
      tile.appendChild(meta);
      tile.addEventListener("click", () => {
        this.activeSession = s.name;
        this.showTerminal();
        TerminalManager.attach(s.name);
        this.updateSessions(this.sessions);
      });
      grid.appendChild(tile);
    }

    if (this.sessions.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "grid-column: 1/-1; text-align:center; color:var(--text-dim); font-size:12px; padding:24px;";
      empty.textContent = "No active sessions";
      grid.appendChild(empty);
    }
  },

  enterFullscreen() {
    document.getElementById("app").classList.add("fullscreen");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
    TerminalManager.term.focus();
  },

  exitFullscreen() {
    document.getElementById("app").classList.remove("fullscreen");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
  },

  async refreshSessions() {
    try {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      this.updateSessions(data.sessions);
    } catch {}
  },

  updateSessions(sessions) {
    this.sessions = sessions;

    // Sidebar list
    const list = document.getElementById("session-list");
    list.innerHTML = "";

    for (const s of sessions) {
      const li = document.createElement("li");
      li.textContent = s.name;
      if (s.name === this.activeSession) li.classList.add("active");

      const del = document.createElement("button");
      del.textContent = "\u00d7";
      del.className = "delete-btn";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteSession(s.name);
      });

      li.appendChild(del);
      li.addEventListener("click", () => {
        this.activeSession = s.name;
        this.showTerminal();
        TerminalManager.attach(s.name);
        this.updateSessions(this.sessions);
      });

      list.appendChild(li);
    }

    // Update home grid if visible
    document.getElementById("home-count").textContent = `${sessions.length} total`;
    if (!document.getElementById("home-view").classList.contains("hidden")) {
      this.renderHomeGrid();
    }
  },

  setActiveSession(name) {
    this.activeSession = name;
    this.showTerminal();
    this.refreshSessions();
  },

  async createSession() {
    const input = document.getElementById("new-session-name");
    const name = input.value.trim();
    if (!name) return;

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Auth.getToken()}`,
        },
        body: JSON.stringify({ name }),
      });
      input.value = "";
      await this.refreshSessions();
    } catch {}
  },

  timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  async deleteSession(name) {
    try {
      await fetch(`/api/sessions/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (this.activeSession === name) {
        TerminalManager.detach();
        this.activeSession = null;
        this.showHome();
      }
      await this.refreshSessions();
    } catch {}
  },
};

Auth.init();
