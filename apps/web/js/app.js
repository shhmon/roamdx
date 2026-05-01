const App = {
  sessions: [],
  activeSession: null,
  pollTimer: null,

  async init() {
    if (!Auth.isAuthenticated()) return;

    TerminalManager.init();
    ClaudePanel.init();

    document.getElementById("new-session-btn").addEventListener("click", () => this.createSession());
    document.getElementById("new-session-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.createSession();
    });

    document.getElementById("fullscreen-btn").addEventListener("click", () => this.enterFullscreen());
    document.getElementById("exit-fullscreen").addEventListener("click", () => this.exitFullscreen());

    await this.refreshSessions();
    this.pollTimer = setInterval(() => this.refreshSessions(), 5000);
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
        TerminalManager.attach(s.name);
        this.updateSessions(this.sessions);
      });

      list.appendChild(li);
    }
  },

  setActiveSession(name) {
    this.activeSession = name;
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

  async deleteSession(name) {
    try {
      await fetch(`/api/sessions/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (this.activeSession === name) {
        TerminalManager.detach();
        this.activeSession = null;
      }
      await this.refreshSessions();
    } catch {}
  },
};

Auth.init();
