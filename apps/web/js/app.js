const App = {
  sessions: [],
  pollTimer: null,
  initialized: false,
  inputBar: null,
  // The active session name is read from TerminalManager.currentSession,
  // which is the single source of truth (it persists across WS reconnects).
  get activeSession() { return TerminalManager.currentSession; },

  async init() {
    if (!Auth.isAuthenticated() || this.initialized) return;
    this.initialized = true;

    TerminalManager.init();
    ClaudePanel.init();
    Voice.init();

    document.getElementById("new-session-btn").addEventListener("click", () => this.createSession());
    document.getElementById("new-session-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.createSession();
    });

    document.getElementById("logo").addEventListener("click", () => this.navigate("/"));

    // Debug overlay: triple-tap the logo to toggle.
    let logoTaps = 0;
    let logoTimer = null;
    document.getElementById("logo").addEventListener("click", () => {
      logoTaps++;
      clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoTaps = 0; }, 600);
      if (logoTaps >= 3) {
        document.getElementById("debug-overlay").classList.toggle("hidden");
        logoTaps = 0;
      }
    });

    // Debug overlay: live-update layout numbers + last keypress when visible.
    const debugEl = document.getElementById("debug-overlay");
    document.addEventListener("keydown", (e) => {
      debugEl.dataset.lastKey =
        `key="${e.key}" code="${e.code}" ctrl=${e.ctrlKey?1:0} shift=${e.shiftKey?1:0} meta=${e.metaKey?1:0} alt=${e.altKey?1:0}`;
    }, true);
    const debugTick = () => {
      if (debugEl.classList.contains("hidden")) return;
      const isl = document.getElementById("isl");
      const r = isl.getBoundingClientRect();
      const vv = window.visualViewport;
      const cssVh = getComputedStyle(document.documentElement).getPropertyValue("--isl-vh").trim();
      debugEl.textContent =
        `vv.h=${vv?.height|0} inner.h=${window.innerHeight}\n` +
        `--isl-vh=${cssVh} (×100=${(parseFloat(cssVh)*100)|0})\n` +
        `#isl rect: top=${r.top|0} bot=${r.bottom|0} h=${r.height|0}\n` +
        `body.h=${document.body.getBoundingClientRect().height|0}\n` +
        `lastKey=${debugEl.dataset.lastKey || "—"}\n` +
        `lastBind=${debugEl.dataset.lastBinding || "—"}\n` +
        `zooms=${debugEl.dataset.zooms || "—"}`;
    };
    setInterval(debugTick, 200);
    document.getElementById("back-btn").addEventListener("click", () => this.navigate("/"));

    this.inputBar = InputBar.createInputBar({
      bar: document.getElementById("input-bar"),
      terminalManager: TerminalManager,
      body: document.body,
    });
    this.initPaneBar();
    document.getElementById("upload-input").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (file) await Upload.uploadAndInsert(file);
      e.target.value = "";
      TerminalManager.term?.focus();
    });
    this.homeNav = HomeNav.createHomeNav({
      grid: document.getElementById("home-grid"),
      isActive: () => !document.getElementById("home-view").classList.contains("hidden"),
      onDelete: (name) => this.deleteSession(name),
    });
    GlobalKeys.installGlobalKeys(this);
    this.initFabMenu();
    this.initQuickActions();

    // Restore persisted UI state
    if (localStorage.getItem("roamdx_fullscreen") === "1") {
      document.getElementById("app").classList.add("fullscreen");
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
    }
    document.getElementById("home-view").classList.remove("hidden");
    document.getElementById("terminal-container").classList.add("hidden");
    document.getElementById("back-btn").classList.add("hidden");
    document.getElementById("fab-menu-btn").classList.add("hidden");
    document.getElementById("fab-menu").classList.add("hidden");
    document.getElementById("quick-actions").classList.add("hidden");
    this.inputBar?.hide();
    await this.refreshSessions();
    this.renderHomeGrid();
    this.updateSessions(this.sessions);
    this.homeNav?.reset();
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

    if (this.activeSession !== name) {
      // attach() updates TerminalManager.currentSession, which our getter exposes
      TerminalManager.attach(name);
      this.updateSessions(this.sessions);
    }
    TerminalManager.scheduleRefit();
  },

  // ── Home grid ──

  renderHomeGrid() {
    const grid = document.getElementById("home-grid");
    grid.innerHTML = "";

    for (const s of this.sessions) {
      grid.appendChild(Tile.createSessionTile(s, {
        onClick: (name) => this.navigate(`/session/${encodeURIComponent(name)}`),
        onDelete: (name) => this.deleteSession(name),
        onRename: async (newName) => {
          await Api.renameSession(s.name, newName);
          await this.refreshSessions();
          this.renderHomeGrid();
        },
        onPreview: (name, canvas) => Preview.render(name, canvas),
      }));
    }

    grid.appendChild(Tile.createNewTile({
      onCreate: async () => {
        const name = "session-" + Date.now().toString(36);
        await Api.createSession(name);
        await this.refreshSessions();
        this.navigate(`session/${encodeURIComponent(name)}`);
      },
    }));

    this.homeNav?.refresh();
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
      ta.blur();
      requestAnimationFrame(() => TerminalManager.term?.focus());
    }
    this.refreshFabState();
  },

  // ── FAB menu ──

  initFabMenu() {
    const trigger = document.getElementById("fab-menu-btn");
    const content = document.getElementById("fab-menu");

    this.fabPopover = Popover.createPopover({
      trigger,
      content,
      onOpen: () => this.refreshFabState(),
    });

    // Don't let menu items steal focus from the terminal.
    content.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) e.preventDefault();
    });

    content.addEventListener("click", (e) => {
      // Zoom rows: handle inline (don't close the menu — let the user keep tapping).
      const zoomBtn = e.target.closest("[data-action]");
      if (zoomBtn) {
        const action = zoomBtn.dataset.action;
        const zoomActions = {
          "term-in":    () => TerminalManager.termZoomIn(),
          "term-out":   () => TerminalManager.termZoomOut(),
          "term-reset": () => TerminalManager.termZoomReset(),
          "app-in":     () => TerminalManager.appZoomIn(),
          "app-out":    () => TerminalManager.appZoomOut(),
          "app-reset":  () => TerminalManager.appZoomReset(),
        };
        if (zoomActions[action]) {
          zoomActions[action]();
          this.refreshFabState();
          return;
        }
      }
      // Regular menu items close the menu after acting.
      const item = e.target.closest(".fab-item");
      if (!item) return;
      const action = item.dataset.action;
      if (action === "hwkb") {
        this.setHwkbMode(localStorage.getItem("roamdx_hwkb") !== "1");
      } else if (action === "fullscreen") {
        this.toggleFullscreen();
      }
      this.fabPopover.close();
    });
  },

  toggleFullscreen() {
    const app = document.getElementById("app");
    app.classList.toggle("fullscreen");
    localStorage.setItem("roamdx_fullscreen", app.classList.contains("fullscreen") ? "1" : "0");
    TerminalManager.scheduleRefit();
    if (!app.classList.contains("fullscreen") && this.activeSession) {
      TerminalManager.term.focus();
    }
    this.refreshFabState();
  },

  initPaneBar() {
    const TMUX_PREFIX = "\x02";
    const send = (...keys) => {
      for (const k of keys) TerminalManager.send({ type: "input", data: k });
    };
    const grid = document.getElementById("cmd-grid");
    // Stop the cmd buttons from stealing focus from the terminal — without
    // this each tap deselects the xterm hidden textarea on iOS.
    grid.addEventListener("mousedown", (e) => {
      // Don't block the cmd toggle — Popover needs the click event.
      if (e.target.closest("#quick-bar-toggle")) return;
      if (e.target.closest("button")) e.preventDefault();
    });
    // The input-bar is a child of cmd-grid but has its own click listener
    // (modifier arming logic). Skip those buttons here.
    grid.addEventListener("click", async (e) => {
      if (e.target.closest("#input-bar")) return;
      if (e.target.closest("#quick-bar-toggle")) return;
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.preventDefault();
      switch (btn.dataset.action) {
        case "paste": {
          try {
            const text = await navigator.clipboard.readText();
            if (text) TerminalManager.send({ type: "input", data: text });
          } catch (err) {
            console.warn("[paste] clipboard read failed", err);
          }
          break;
        }
        case "upload": {
          document.getElementById("upload-input").click();
          break;
        }
        case "wake":       TerminalManager.send({ type: "wake" }); break;
        case "zoom":       send(TMUX_PREFIX, "z"); break;
        case "close-pane": send(TMUX_PREFIX, "x"); break;
        case "split-down": send(TMUX_PREFIX, '"'); break;
      }
      TerminalManager.term?.focus();
    });
  },

  initQuickActions() {
    const refocus = () => TerminalManager.term?.focus();

    document.getElementById("quick-bar-toggle").addEventListener("click", (e) => {
      e.preventDefault();
      this.inputBar.toggle();
      refocus();
    });

    document.getElementById("quick-enter").addEventListener("click", (e) => {
      e.preventDefault();
      if (Voice.isRecording) Voice.commit(true);
      else TerminalManager.send({ type: "input", data: "\x0d" });
      refocus();
    });

    document.getElementById("quick-mic").addEventListener("click", (e) => {
      e.preventDefault();
      if (Voice.isRecording) Voice.commit(false);
      else Voice.start();
      // Don't refocus on mic — Voice owns its own focus flow.
    });
  },

  refreshFabState() {
    const hwkb = localStorage.getItem("roamdx_hwkb") === "1";
    const fullscreen = document.getElementById("app").classList.contains("fullscreen");
    const set = (action, on) => {
      const item = document.querySelector(`.fab-item[data-action="${action}"]`);
      if (!item) return;
      item.classList.toggle("active", on);
      const state = item.querySelector(".fab-state");
      if (state) state.textContent = on ? "ON" : "";
    };
    set("hwkb", hwkb);
    set("fullscreen", fullscreen);
    // Update zoom percentage labels
    const termPctEl = document.querySelector('.fab-zoom-value[data-action="term-reset"]');
    const appPctEl = document.querySelector('.fab-zoom-value[data-action="app-reset"]');
    if (termPctEl) termPctEl.textContent = `${TerminalManager.termZoomPercent()}%`;
    if (appPctEl) appPctEl.textContent = `${TerminalManager.appZoomPercent()}%`;
  },

  // ── Fullscreen ──

  enterFullscreen() {
    document.getElementById("app").classList.add("fullscreen");
    TerminalManager.scheduleRefit();
    if (this.activeSession) TerminalManager.term.focus();
  },

  exitFullscreen() {
    document.getElementById("app").classList.remove("fullscreen");
    TerminalManager.scheduleRefit();
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

};

Auth.init();
