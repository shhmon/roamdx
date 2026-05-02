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

    document.getElementById("logo").addEventListener("click", () => this.navigate("/"));

    document.getElementById("fullscreen-btn").addEventListener("click", () => {
      const app = document.getElementById("app");
      app.classList.toggle("fullscreen");
      setTimeout(() => TerminalManager.fitAddon.fit(), 50);
      if (!app.classList.contains("fullscreen") && this.activeSession) {
        TerminalManager.term.focus();
      }
    });

    window.addEventListener("popstate", () => this.route());

    await this.refreshSessions();
    this.route();
    this.pollTimer = setInterval(() => this.refreshSessions(), 5000);
  },

  // ── Routing ──

  navigate(path) {
    history.pushState(null, "", path);
    this.route();
  },

  route() {
    const path = window.location.pathname;

    if (path.startsWith("/session/")) {
      const name = decodeURIComponent(path.slice(9));
      this.showSession(name);
    } else {
      this.showHome();
    }
  },

  async showHome() {
    if (this.activeSession) {
      TerminalManager.detach();
      this.activeSession = null;
    }
    document.getElementById("home-view").classList.remove("hidden");
    document.getElementById("terminal-container").classList.add("hidden");
    await this.refreshSessions();
    this.renderHomeGrid();
    this.updateSessions(this.sessions);
  },

  showSession(name) {
    document.getElementById("home-view").classList.add("hidden");
    document.getElementById("terminal-container").classList.remove("hidden");

    if (this.activeSession !== name) {
      this.activeSession = name;
      TerminalManager.attach(name);
      this.updateSessions(this.sessions);
    }
    setTimeout(() => TerminalManager.fitAddon.fit(), 10);
  },

  // ── Home grid ──

  renderHomeGrid() {
    const grid = document.getElementById("home-grid");
    grid.innerHTML = "";

    for (const s of this.sessions) {
      const tile = document.createElement("div");
      tile.className = "home-tile";

      const close = document.createElement("button");
      close.className = "tile-close";
      close.textContent = "\u00d7";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteSession(s.name);
      });

      const name = document.createElement("span");
      name.className = "tile-name";
      name.textContent = s.name;

      const canvas = document.createElement("canvas");
      canvas.className = "tile-preview";
      Preview.render(s.name, canvas);

      const meta = document.createElement("div");
      meta.className = "tile-meta";
      const created = new Date(parseInt(s.created) * 1000);
      meta.innerHTML = `<span>${s.cols}x${s.rows}</span><span>${this.timeAgo(created)}</span>`;

      tile.appendChild(close);
      tile.appendChild(name);
      tile.appendChild(canvas);
      tile.appendChild(meta);
      tile.addEventListener("click", () => this.navigate(`/session/${encodeURIComponent(s.name)}`));
      grid.appendChild(tile);
    }

    // New session tile
    const newTile = document.createElement("div");
    newTile.className = "home-tile home-tile-new";
    newTile.innerHTML = '<span class="tile-plus">+</span>';
    newTile.addEventListener("click", async () => {
      const name = "session-" + Date.now().toString(36);
      await Api.createSession(name);
      await this.refreshSessions();
      this.navigate(`session/${encodeURIComponent(name)}`);
    });
    grid.appendChild(newTile);
  },

  // ── Fullscreen ──

  enterFullscreen() {
    document.getElementById("app").classList.add("fullscreen");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
    if (this.activeSession) TerminalManager.term.focus();
  },

  exitFullscreen() {
    document.getElementById("app").classList.remove("fullscreen");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
  },

  // ── Data ──

  async refreshSessions() {
    try {
      const sessions = await Api.listSessions();
      this.updateSessions(sessions);
    } catch {}
  },

  updateSessions(sessions) {
    this.sessions = sessions;

    // Sidebar
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
      li.addEventListener("click", () => this.navigate(`/session/${encodeURIComponent(s.name)}`));
      list.appendChild(li);
    }

    document.getElementById("home-count").textContent = `${sessions.length} total`;
  },

  setActiveSession(name) {
    this.navigate(`session/${encodeURIComponent(name)}`);
  },

  async createSession() {
    const input = document.getElementById("new-session-name");
    const name = input.value.trim();
    if (!name) return;

    await Api.createSession(name);
    input.value = "";
    await this.refreshSessions();
  },

  async deleteSession(name) {
    await Api.deleteSession(name);
    if (this.activeSession === name) {
      this.navigate("/");
    }
    await this.refreshSessions();
    if (!document.getElementById("home-view").classList.contains("hidden")) {
      this.renderHomeGrid();
    }
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
};

Auth.init();
