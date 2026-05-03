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

    // Scroll zone — iOS-style kinetic scrolling for tmux
    const scrollZone = document.getElementById("scroll-zone");
    if (scrollZone) {
      let lastY = null;
      let lastTime = 0;
      let velocity = 0;
      let accum = 0;
      let amplitude = 0;
      let target = 0;
      let position = 0;
      let timestamp = 0;
      let inertiaFrame = null;
      const TIME_CONSTANT = 325; // ms — matches iOS
      const LINE_HEIGHT = 30; // px per terminal line

      const sendScroll = (up) => {
        const btn = up ? 97 : 96;
        this.send({ type: "input", data: `\x1b[M${String.fromCharCode(btn)}\x21\x21` });
      };

      const flushLines = () => {
        while (Math.abs(accum) >= LINE_HEIGHT) {
          sendScroll(accum > 0);
          accum -= accum > 0 ? LINE_HEIGHT : -LINE_HEIGHT;
        }
      };

      const inertia = () => {
        const elapsed = Date.now() - timestamp;
        const delta = -amplitude * Math.exp(-elapsed / TIME_CONSTANT);
        if (Math.abs(delta) > 0.5) {
          const newPos = target + delta;
          accum += newPos - position;
          position = newPos;
          flushLines();
          inertiaFrame = requestAnimationFrame(inertia);
        }
      };

      scrollZone.addEventListener("touchstart", (e) => {
        if (inertiaFrame) cancelAnimationFrame(inertiaFrame);
        lastY = e.touches[0].clientY;
        lastTime = Date.now();
        velocity = 0;
        accum = 0;
        position = 0;
        e.preventDefault();
      });

      scrollZone.addEventListener("touchmove", (e) => {
        if (lastY === null) return;
        e.preventDefault();
        const now = Date.now();
        const dy = lastY - e.touches[0].clientY;
        const dt = Math.max(now - lastTime, 1);
        velocity = 0.8 * velocity + 0.2 * (dy / dt * 1000); // smoothed velocity in px/s
        lastY = e.touches[0].clientY;
        lastTime = now;
        accum += dy;
        position += dy;
        flushLines();
      });

      scrollZone.addEventListener("touchend", () => {
        lastY = null;
        amplitude = 0.8 * velocity / 1000 * TIME_CONSTANT; // projected distance
        target = Math.round(position + amplitude);
        timestamp = Date.now();
        inertiaFrame = requestAnimationFrame(inertia);
      });
    }

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
          this.term.write(msg.data);
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
