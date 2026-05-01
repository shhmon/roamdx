const Preview = {
  PALETTE: [
    "#f2767c", "#9BE17D", "#ffcb72", "#75B0F7", "#B58DF5", "#08bdba",
    "#f85370", "#9bdead", "#f6d96d", "#6B9BD1", "#ee9cdd", "#6bdbda",
  ],

  BG: "#19212e",
  DEFAULT_FG: "#c3cfd9",
  SKIP: new Set(["#1c2433", "#444c5b", "#c3cfd9"]),
  GRID: 4,

  async render(sessionName, canvas) {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionName)}/preview`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (!res.ok) return;
      const { content } = await res.json();

      const colors = this.extractColors(content);
      this.drawGrid(canvas, colors, sessionName);
    } catch {}
  },

  extractColors(content) {
    const colors = [];
    const lines = content.split("\n");
    let fg = this.DEFAULT_FG;
    const ansi = [
      "#1c2433", "#f2767c", "#9BE17D", "#ffcb72", "#75B0F7", "#B58DF5", "#08bdba", "#c3cfd9",
      "#444c5b", "#f85370", "#9bdead", "#f6d96d", "#6B9BD1", "#ee9cdd", "#6bdbda", "#c3cfd9",
    ];

    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "\x1b" && line[i + 1] === "[") {
          let j = i + 2;
          while (j < line.length && line[j] !== "m") j++;
          const codes = line.slice(i + 2, j).split(";").map(Number);
          for (let k = 0; k < codes.length; k++) {
            const c = codes[k];
            if (c === 0 || c === 39) fg = this.DEFAULT_FG;
            else if (c >= 30 && c <= 37) fg = ansi[c - 30];
            else if (c >= 90 && c <= 97) fg = ansi[c - 90 + 8];
            else if (c === 38 && codes[k + 1] === 5) { k += 2; }
            else if (c === 38 && codes[k + 1] === 2) {
              fg = `rgb(${codes[k+2]},${codes[k+3]},${codes[k+4]})`;
              k += 4;
            }
          }
          i = j;
        } else if (line[i] !== " " && line.charCodeAt(i) > 31) {
          if (!this.SKIP.has(fg)) {
            colors.push(fg);
          }
        }
      }
    }
    return colors;
  },

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  },

  drawGrid(canvas, colors, name) {
    const g = this.GRID;
    canvas.width = g;
    canvas.height = g;
    const ctx = canvas.getContext("2d");
    const total = g * g;

    // Unique vibrant colors from terminal
    const seen = new Set();
    const palette = [];
    for (const c of colors) {
      if (!seen.has(c)) {
        seen.add(c);
        palette.push(c);
      }
    }

    // Pad with theme palette if needed, seeded by name
    const seed = this.hash(name);
    let idx = seed;
    while (palette.length < 3) {
      palette.push(this.PALETTE[idx % this.PALETTE.length]);
      idx++;
    }

    // Seeded PRNG
    let rng = seed;
    const next = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; };

    // Every cell gets a color — mix palette colors with slightly dimmed variants
    for (let i = 0; i < total; i++) {
      const x = i % g;
      const y = Math.floor(i / g);
      const color = palette[next() % palette.length];
      // Vary opacity per cell for depth
      ctx.globalAlpha = 0.4 + (next() % 60) / 100;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  },
};
