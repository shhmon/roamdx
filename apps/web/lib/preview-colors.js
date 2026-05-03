// Pure ANSI color extraction. Given a tmux pane capture string with SGR
// escape sequences, returns the foreground colors of each visible character
// (skipping spaces and theme-default tones).
//
// Exposed as both an ES module (for tests) and a global (for browser).

const DEFAULT_FG = "#c3cfd9";
const SKIP = new Set(["#1c2433", "#444c5b", "#c3cfd9"]);
const ANSI_BASIC = [
  "#1c2433", "#f2767c", "#9BE17D", "#ffcb72", "#75B0F7", "#B58DF5", "#08bdba", "#c3cfd9",
  "#444c5b", "#f85370", "#9bdead", "#f6d96d", "#6B9BD1", "#ee9cdd", "#6bdbda", "#c3cfd9",
];

export function extractColors(content) {
  const colors = [];
  const lines = content.split("\n");
  let fg = DEFAULT_FG;

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "\x1b" && line[i + 1] === "[") {
        let j = i + 2;
        while (j < line.length && line[j] !== "m") j++;
        const codes = line.slice(i + 2, j).split(";").map(Number);
        for (let k = 0; k < codes.length; k++) {
          const c = codes[k];
          if (c === 0 || c === 39) fg = DEFAULT_FG;
          else if (c >= 30 && c <= 37) fg = ANSI_BASIC[c - 30];
          else if (c >= 90 && c <= 97) fg = ANSI_BASIC[c - 90 + 8];
          else if (c === 38 && codes[k + 1] === 5) { k += 2; }
          else if (c === 38 && codes[k + 1] === 2) {
            fg = `rgb(${codes[k + 2]},${codes[k + 3]},${codes[k + 4]})`;
            k += 4;
          }
        }
        i = j;
      } else if (line[i] !== " " && line.charCodeAt(i) > 31) {
        if (!SKIP.has(fg)) colors.push(fg);
      }
    }
  }
  return colors;
}

export function hashName(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Browser shim: also expose on window so non-module scripts can use it.
if (typeof window !== "undefined") {
  window.PreviewColors = { extractColors, hashName };
}
