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
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: 1,
      fontSize: 14.2,
      fontWeight: "500",
      fontWeightBold: "700",
      lineHeight: 1.05,
      fontFamily: '"JetBrainsMono Nerd Font Mono", "JetBrainsMono NFM", monospace',
      theme: {
        background: "#19212e",
        foreground: "#c3cfd9",
        cursor: "#c3cfd9",
        cursorAccent: "#1c2433",
        selectionBackground: "#303847",
        selectionForeground: "#c3cfd9",
        black: "#1c2433",
        brightBlack: "#444c5b",
        red: "#f2767c",
        brightRed: "#f85370",
        green: "#9BE17D",
        brightGreen: "#9bdead",
        yellow: "#ffcb72",
        brightYellow: "#f6d96d",
        blue: "#75B0F7",
        brightBlue: "#6B9BD1",
        magenta: "#B58DF5",
        brightMagenta: "#ee9cdd",
        cyan: "#08bdba",
        brightCyan: "#6bdbda",
        white: "#c3cfd9",
        brightWhite: "#c3cfd9",
      },
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);

    const container = document.getElementById("terminal-container");
    this.term.open(container);
    this.fitAddon.fit();

    new ResizeObserver(() => {
      this.fitAddon.fit();
      this.sendResize();
    }).observe(container);

    const updateHeight = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty("--isl-vh", h * 0.01 + "px");
      this.fitAddon.fit();
      this.sendResize();
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
    }
    window.addEventListener("resize", updateHeight);
    updateHeight();

    Scroll.init(this);
    Upload.init();

    // Intercept keys before xterm.js processes them — return false to suppress
    this.term.attachCustomKeyEventHandler((event) => {
      if (Keybindings.handle(event, this)) return false;
      return true;
    });

    this.term.onData((data) => {
      if (this.ctrlActive) {
        // Convert to control character
        const ch = data.toLowerCase();
        const code = ch.charCodeAt(0) - 96;
        if (code > 0 && code < 27) {
          this.send({ type: "input", data: String.fromCharCode(code) });
        }
        this.ctrlActive = false;
        const ctrlBtn = document.querySelector('[data-mod="ctrl"]');
        if (ctrlBtn) ctrlBtn.classList.remove("active");
        return;
      }
      this.send({ type: "input", data });
    });

    this.initMobileKeys();
    this.connect();
  },

  ctrlActive: false,

  initMobileKeys() {
    const bar = document.getElementById("mobile-keys");
    if (!bar) return;

    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      // Don't interfere with mic button
      if (btn.id === "voice-btn") return;

      e.preventDefault();

      if (btn.dataset.mod === "ctrl") {
        this.ctrlActive = !this.ctrlActive;
        btn.classList.toggle("active", this.ctrlActive);
        this.term.focus();
        return;
      }

      // If recording and Enter pressed, stop recording (onend will send transcript + Enter)
      if (Voice.isRecording && btn.dataset.key === "\\x0d") {
        Voice.sendEnterOnStop = true;
        Voice.stop();
        return;
      }

      const raw = btn.dataset.key;
      if (raw) {
        const key = raw.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        this.send({ type: "input", data: key });
        // Only refocus if virtual keyboard is already up
        const kbOpen = window.visualViewport && window.visualViewport.height < window.innerHeight * 0.85;
        if (kbOpen) this.term.focus();
      }
    });

  },

  connect() {
    const token = Auth.getToken();
    if (!token) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${proto}//${location.host}/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectDelay = 1000;
      if (this.currentSession) {
        this.attach(this.currentSession);
      }
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "output":
          this.term.write(msg.data.replace(/[●⏺🔵🔴⚫⬤]/g, "∙"));
          break;
        case "attached":
          this.setStatus("connected");
          break;
        case "error":
          console.error("[roamdx]", msg.message);
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

  // Refit after layout settles. Two rAFs is the standard "wait one full
  // layout pass" idiom — replaces the old setTimeout(..., 10/50) magic.
  scheduleRefit() {
    if (!this.fitAddon) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.fitAddon.fit();
      this.sendResize();
    }));
  },

  attach(sessionId) {
    this.currentSession = sessionId;
    this.term.reset();
    this.fitAddon.fit();
    this.send({ type: "attach", sessionId, cols: this.term.cols, rows: this.term.rows });
    this.term.focus();
  },

  detach() {
    this.send({ type: "detach" });
    this.currentSession = null;
    this.term.reset();
  },

  setStatus(state) {
    const dot = document.getElementById("status-dot");
    dot.className = `dot ${state}`;
  },
};
