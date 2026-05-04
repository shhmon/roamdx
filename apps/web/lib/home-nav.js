// Keyboard navigation for the home grid.
// h/l move horizontally, j/k vertically. Enter activates.
// Ctrl+W deletes the selected session. Ctrl+R renames it.
// Ctrl+F toggles fullscreen.
// Selection clamps at edges; first item is selected by default.

export function createHomeNav({ grid, isActive, onDelete, onFullscreen }) {
  let index = 0;

  // Tile names exist on session tiles only; the "+" tile is last and has no
  // dataset. Using `.home-tile` covers both, which is what we want — Enter
  // on the "+" tile triggers its own click handler.
  const tiles = () => Array.from(grid.querySelectorAll(".home-tile"));

  function clamp(i) {
    const n = tiles().length;
    if (n === 0) return 0;
    return Math.max(0, Math.min(i, n - 1));
  }

  function columnsInFirstRow() {
    const all = tiles();
    if (all.length < 2) return all.length || 1;
    const firstTop = all[0].getBoundingClientRect().top;
    let count = 0;
    for (const t of all) {
      if (Math.abs(t.getBoundingClientRect().top - firstTop) < 1) count++;
      else break;
    }
    return count || 1;
  }

  function paint() {
    const all = tiles();
    if (all.length === 0) return;
    index = clamp(index);
    for (let i = 0; i < all.length; i++) {
      all[i].classList.toggle("selected", i === index);
    }
    all[index].scrollIntoView({ block: "nearest" });
  }

  function move(dx, dy) {
    const cols = columnsInFirstRow();
    const next = index + dx + dy * cols;
    index = clamp(next);
    paint();
  }

  function activate() {
    const all = tiles();
    all[index]?.click();
  }

  function deleteSelected() {
    const all = tiles();
    const tile = all[index];
    if (!tile) return;
    const nameEl = tile.querySelector(".tile-name");
    const sessionName = nameEl?.textContent;
    if (!sessionName) return; // "+" tile has no name
    onDelete?.(sessionName);
  }

  function renameSelected() {
    const all = tiles();
    const nameEl = all[index]?.querySelector(".tile-name");
    if (!nameEl) return;
    nameEl.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  }

  function reset() {
    index = 0;
    paint();
  }

  function onKeydown(e) {
    if (!isActive()) return;
    // Don't capture if the user is typing in an input (rename, search, etc).
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
      onFullscreen?.();
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && !e.shiftKey && (e.key === "w" || e.key === "W")) {
      deleteSelected();
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && !e.shiftKey && (e.key === "r" || e.key === "R")) {
      renameSelected();
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case "h": case "ArrowLeft":  move(-1, 0); e.preventDefault(); break;
      case "l": case "ArrowRight": move(1, 0);  e.preventDefault(); break;
      case "j": case "ArrowDown":  move(0, 1);  e.preventDefault(); break;
      case "k": case "ArrowUp":    move(0, -1); e.preventDefault(); break;
      case "Enter": activate(); e.preventDefault(); break;
    }
  }

  document.addEventListener("keydown", onKeydown);

  return {
    /** Re-apply selection after the grid is re-rendered. */
    refresh: paint,
    reset,
  };
}

if (typeof window !== "undefined") {
  window.HomeNav = { createHomeNav };
}
