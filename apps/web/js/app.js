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
    document.getElementById("back-btn").addEventListener("click", () => this.navigate("/"));

    this.initFabMenu();
    this.initQuickActions();

    // Restore persisted UI state
    if (localStorage.getItem("roamdx_fullscreen") === "1") {
      document.getElementById("app").classList.add("fullscreen");
    }
    if (localStorage.getItem("roamdx_keys") === "1") {
      document.getElementById("mobile-keys").classList.add("visible");
      document.body.classList.add("bar-visible");
    }
    if (localStorage.getItem("roamdx_hwkb") === "1") {
      this.setHwkbMode(true);
    }

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
    document.getElementById("back-btn").classList.add("hidden");
    document.getElementById("fab-menu-btn").classList.add("hidden");
    document.getElementById("fab-menu").classList.add("hidden");
    document.getElementById("quick-actions").classList.add("hidden");
    document.getElementById("mobile-keys").classList.remove("visible");
    document.body.classList.remove("bar-visible");
    await this.refreshSessions();
    this.renderHomeGrid();
    this.updateSessions(this.sessions);
  },

  async showSession(name) {
    const exists = this.sessions.find((s) => s.name === name);
    if (!exists) {
      await this.refreshSessions();
      const stillExists = this.sessions.find((s) => s.name === name);
      if (!stillExists) {
        this.navigate("/");
        return;
      }
    }

    document.getElementById("home-view").classList.add("hidden");
    document.getElementById("terminal-container").classList.remove("hidden");
    document.getElementById("back-btn").classList.remove("hidden");
    document.getElementById("fab-menu-btn").classList.remove("hidden");
    document.getElementById("quick-actions").classList.remove("hidden");

    // Re-apply persisted input bar state when entering a session
    if (localStorage.getItem("roamdx_keys") === "1") {
      document.getElementById("mobile-keys").classList.add("visible");
      document.body.classList.add("bar-visible");
    }

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
      name.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.className = "tile-rename";
        input.value = s.name;
        name.replaceWith(input);
        input.focus();
        input.select();
        const commit = async () => {
          const newName = input.value.trim();
          if (newName && newName !== s.name) {
            await Api.renameSession(s.name, newName);
            await this.refreshSessions();
            this.renderHomeGrid();
          } else {
            input.replaceWith(name);
          }
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); input.blur(); }
          if (ev.key === "Escape") { input.removeEventListener("blur", commit); input.replaceWith(name); }
        });
      });

      const canvas = document.createElement("canvas");
      canvas.className = "tile-preview";
      Preview.render(s.name, canvas);

      const meta = document.createElement("div");
      meta.className = "tile-meta";
      const created = new Date(parseInt(s.created) * 1000);
      const shortPath = s.path ? s.path.replace(/^\/Users\/[^/]+/, "~") : "";
      meta.innerHTML = `<span>${s.command || "zsh"}${shortPath ? " · " + shortPath : ""}</span><span>${this.timeAgo(created)}</span>`;

      tile.appendChild(close);
      tile.appendChild(name);
      tile.appendChild(canvas);
      tile.appendChild(meta);
      tile.addEventListener("click", (e) => {
        if (e.target === name) return;
        this.navigate(`/session/${encodeURIComponent(s.name)}`);
      });
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

  // ── Hardware keyboard mode ──
  // Suppresses iOS soft keyboard + accessory bar by setting inputmode=none on
  // xterm's hidden textarea. Manual toggle since iOS gives no API to detect a
  // connected hardware keyboard.

  setHwkbMode(on) {
    localStorage.setItem("roamdx_hwkb", on ? "1" : "0");
    const ta = document.querySelector("#terminal-container textarea.xterm-helper-textarea");
    if (ta) {
      if (on) ta.setAttribute("inputmode", "none");
      else ta.removeAttribute("inputmode");
      // Re-focus to make iOS pick up the change
      ta.blur();
      requestAnimationFrame(() => TerminalManager.term?.focus());
    }
    this.refreshFabState();
  },

  setKeysBar(on) {
    const bar = document.getElementById("mobile-keys");
    bar.classList.toggle("visible", on);
    document.body.classList.toggle("bar-visible", on);
    localStorage.setItem("roamdx_keys", on ? "1" : "0");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
    this.refreshFabState();
  },

  // ── FAB menu ──

  initFabMenu() {
    const fab = document.getElementById("fab-menu-btn");
    const menu = document.getElementById("fab-menu");

    const close = () => {
      menu.classList.add("hidden");
      fab.classList.remove("open");
    };
    const open = () => {
      this.refreshFabState();
      menu.classList.remove("hidden");
      fab.classList.add("open");
    };

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.contains("hidden") ? open() : close();
    });

    // Close when tapping outside
    document.addEventListener("click", (e) => {
      if (menu.classList.contains("hidden")) return;
      if (!menu.contains(e.target) && e.target !== fab) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.classList.contains("hidden")) close();
    });

    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".fab-item");
      if (!item) return;
      const action = item.dataset.action;
      if (action === "hwkb") {
        const on = localStorage.getItem("roamdx_hwkb") !== "1";
        this.setHwkbMode(on);
      } else if (action === "keys") {
        const on = !document.getElementById("mobile-keys").classList.contains("visible");
        this.setKeysBar(on);
      } else if (action === "fullscreen") {
        this.toggleFullscreen();
      }
      close();
    });
  },

  toggleFullscreen() {
    const app = document.getElementById("app");
    app.classList.toggle("fullscreen");
    localStorage.setItem("roamdx_fullscreen", app.classList.contains("fullscreen") ? "1" : "0");
    setTimeout(() => TerminalManager.fitAddon.fit(), 50);
    if (!app.classList.contains("fullscreen") && this.activeSession) {
      TerminalManager.term.focus();
    }
    this.refreshFabState();
  },

  initQuickActions() {
    document.getElementById("quick-enter").addEventListener("click", (e) => {
      e.preventDefault();
      if (Voice.isRecording) Voice.commit(true);
      else TerminalManager.send({ type: "input", data: "\x0d" });
    });

    document.getElementById("quick-mic").addEventListener("click", (e) => {
      e.preventDefault();
      if (Voice.isRecording) Voice.commit(false);
      else Voice.start();
    });
  },

  refreshFabState() {
    const hwkb = localStorage.getItem("roamdx_hwkb") === "1";
    const keys = document.getElementById("mobile-keys").classList.contains("visible");
    const fullscreen = document.getElementById("app").classList.contains("fullscreen");
    const set = (action, on) => {
      const item = document.querySelector(`.fab-item[data-action="${action}"]`);
      if (!item) return;
      item.classList.toggle("active", on);
      const state = item.querySelector(".fab-state");
      if (state) state.textContent = on ? "ON" : "";
    };
    set("hwkb", hwkb);
    set("keys", keys);
    set("fullscreen", fullscreen);
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
