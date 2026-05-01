const Preview = {
  ANSI_COLORS: [
    "#1c2433", "#f2767c", "#9BE17D", "#ffcb72", "#75B0F7", "#B58DF5", "#08bdba", "#c3cfd9",
    "#444c5b", "#f85370", "#9bdead", "#f6d96d", "#6B9BD1", "#ee9cdd", "#6bdbda", "#c3cfd9",
  ],

  BG: "#19212e",
  DEFAULT_FG: "#c3cfd9",

  async render(sessionName, canvas, cols, rows) {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionName)}/preview`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      if (!res.ok) return;
      const { content } = await res.json();

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = this.BG;
      ctx.fillRect(0, 0, cols, rows);

      const lines = content.split("\n");
      let fg = this.DEFAULT_FG;

      for (let y = 0; y < Math.min(lines.length, rows); y++) {
        const line = lines[y];
        let x = 0;
        fg = this.DEFAULT_FG;

        for (let i = 0; i < line.length && x < cols; i++) {
          if (line[i] === "\x1b" && line[i + 1] === "[") {
            let j = i + 2;
            while (j < line.length && line[j] !== "m") j++;
            const codes = line.slice(i + 2, j).split(";").map(Number);
            for (let k = 0; k < codes.length; k++) {
              const c = codes[k];
              if (c === 0 || c === 39) fg = this.DEFAULT_FG;
              else if (c >= 30 && c <= 37) fg = this.ANSI_COLORS[c - 30];
              else if (c >= 90 && c <= 97) fg = this.ANSI_COLORS[c - 90 + 8];
              else if (c === 38 && codes[k + 1] === 5) { k += 2; }
              else if (c === 38 && codes[k + 1] === 2) {
                fg = `rgb(${codes[k+2]},${codes[k+3]},${codes[k+4]})`;
                k += 4;
              }
            }
            i = j;
          } else if (line[i] !== " " && line.charCodeAt(i) > 31) {
            ctx.fillStyle = fg;
            ctx.fillRect(x, y, 1, 1);
            x++;
          } else {
            x++;
          }
        }
      }
    } catch {}
  },
};
