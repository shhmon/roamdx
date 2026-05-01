const TerminalManager = {
  term: null,
  fitAddon: null,
  ws: null,
  currentSession: null,
  reconnectTimer: null,
  reconnectDelay: 1000,

  init() {
    this.term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
      },
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);

    const container = document.getElementById("terminal-container");
    this.term.open(container);
    this.fitAddon.fit();

    // Resize observer
    new ResizeObserver(() => {
      this.fitAddon.fit();
      this.sendResize();
    }).observe(container);

    // Handle viewport changes (mobile keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        this.fitAddon.fit();
        this.sendResize();
      });
    }

    // Input from terminal -> WS
    this.term.onData((data) => {
      this.send({ type: "input", data });
    });

    this.connect();
  },

  connect() {
    const token = Auth.getToken();
    if (!token) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${proto}//${location.host}/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectDelay = 1000;
      // Re-attach if we were attached
      if (this.currentSession) {
        this.attach(this.currentSession);
      }
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "output":
          this.term.reset();
          this.term.write(msg.data);
          break;
        case "attached":
          this.setStatus("connected");
          break;
        case "error":
          console.error("Server error:", msg.message);
          break;
        case "sessions":
          if (typeof App !== "undefined") App.updateSessions(msg.sessions);
          break;
      }
    };

    this.ws.onclose = () => {
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setStatus("disconnected");
    };
  },

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.setStatus("connecting");
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
  },

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  },

  sendResize() {
    if (this.term && this.currentSession) {
      this.send({ type: "resize", cols: this.term.cols, rows: this.term.rows });
    }
  },

  attach(sessionId) {
    this.currentSession = sessionId;
    this.term.reset();
    this.send({ type: "attach", sessionId });
    this.sendResize();
    this.term.focus();
  },

  detach() {
    this.send({ type: "detach" });
    this.currentSession = null;
    this.term.reset();
    this.term.write("No session attached. Select one from the sidebar.");
  },

  setStatus(state) {
    const dot = document.getElementById("status-dot");
    dot.className = `dot ${state}`;
  },
};
