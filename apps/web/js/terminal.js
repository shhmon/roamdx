const TerminalManager = {
  term: null,
  fitAddon: null,
  ws: null,
  currentSession: null,
  reconnectTimer: null,
  reconnectDelay: 1000,

  init() {
    const savedTermSize = parseFloat(localStorage.getItem("roamdx_term_size"));
    const savedAppZoom = parseFloat(localStorage.getItem("roamdx_app_zoom"));
    if (Number.isFinite(savedAppZoom)) this.applyZoom(savedAppZoom);
    this.term = new Terminal({
      cursorBlink: true,
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: 1,
      fontSize: Number.isFinite(savedTermSize) ? savedTermSize : 14.2,
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

    // Intercept keys before xterm.js processes them — return false to suppress.
    // Global app shortcuts (Ctrl+F, Ctrl+Q) win over the document listener
    // because xterm consumes the event when its textarea has focus.
    this.term.attachCustomKeyEventHandler((event) => {
      if (window.GlobalKeys?.handleGlobalKey(event, App)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
      if (Keybindings.handle(event, this)) return false;
      return true;
    });

    this.term.onData((data) => {
      // Apply armed input-bar modifiers (shift/ctrl) to the next keystroke.
      // The bar clears its armed state after consuming the keypress.
      const ib = App.inputBar;
      const out = ib && ib.isArmed() ? ib.applyToData(data) : data;
      this.send({ type: "input", data: out });
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

  // ── Terminal font size (xterm only) ──
  DEFAULT_TERM_SIZE: 14.2,
  MIN_TERM_SIZE: 8,
  MAX_TERM_SIZE: 28,
  TERM_STEP: 1,

  setTermSize(size) {
    if (!this.term) return;
    const clamped = Math.max(this.MIN_TERM_SIZE, Math.min(this.MAX_TERM_SIZE, size));
    this.term.options.fontSize = clamped;
    localStorage.setItem("roamdx_term_size", String(clamped));
    this.scheduleRefit();
  },
  termZoomIn()    { this.setTermSize((this.term?.options.fontSize ?? this.DEFAULT_TERM_SIZE) + this.TERM_STEP); },
  termZoomOut()   { this.setTermSize((this.term?.options.fontSize ?? this.DEFAULT_TERM_SIZE) - this.TERM_STEP); },
  termZoomReset() { this.setTermSize(this.DEFAULT_TERM_SIZE); },
  termZoomPercent() {
    const size = this.term?.options.fontSize ?? this.DEFAULT_TERM_SIZE;
    return Math.round((size / this.DEFAULT_TERM_SIZE) * 100);
  },

  // ── App zoom (CSS `zoom` on <html>) ──
  // Scales the entire UI like browser Cmd +/-. We counter-scale #isl so the
  // root container always fills the visible viewport regardless of zoom.
  MIN_APP_ZOOM: 0.7,
  MAX_APP_ZOOM: 1.6,
  APP_STEP: 0.1,

  setAppZoom(scale) {
    const clamped = Math.max(this.MIN_APP_ZOOM, Math.min(this.MAX_APP_ZOOM, scale));
    localStorage.setItem("roamdx_app_zoom", String(clamped));
    this.applyZoom(clamped);
    this.scheduleRefit();
  },
  appZoomIn()    { this.setAppZoom(this.currentAppZoom() + this.APP_STEP); },
  appZoomOut()   { this.setAppZoom(this.currentAppZoom() - this.APP_STEP); },
  appZoomReset() { this.setAppZoom(1); },
  currentAppZoom() {
    const v = parseFloat(localStorage.getItem("roamdx_app_zoom"));
    return Number.isFinite(v) ? v : 1;
  },
  appZoomPercent() {
    return Math.round(this.currentAppZoom() * 100);
  },

  applyZoom(scale) {
    document.documentElement.style.zoom = String(scale);
    const isl = document.getElementById("isl");
    if (isl) isl.style.height = `calc(var(--isl-vh, 1dvh) * 100 / ${scale})`;
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
