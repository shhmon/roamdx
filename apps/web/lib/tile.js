// Home-grid tile factories. Pure DOM construction — no state, no globals
// (handlers come from the caller). Returns an HTMLElement ready to append.
//
// Why functions instead of a class: each tile is short-lived (re-rendered on
// every grid refresh) and we don't share state across instances. A function
// returning a DOM tree is the simplest unit that does the job.

import { timeAgo, shortPath } from "./format.js";

/**
 * @param {Object} session  - { name, created, command, path }
 * @param {Object} handlers - { onClick, onDelete, onRename(newName), onPreview(canvas) }
 */
export function createSessionTile(session, handlers) {
  const tile = el("div", "home-tile");

  const close = el("button", "tile-close");
  close.textContent = "×";
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.onDelete?.(session.name);
  });

  const name = el("span", "tile-name");
  name.textContent = session.name;
  name.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    startRename(name, session.name, handlers.onRename);
  });

  const canvas = el("canvas", "tile-preview");
  handlers.onPreview?.(session.name, canvas);

  const meta = el("div", "tile-meta");
  const created = new Date(parseInt(session.created) * 1000);
  const path = shortPath(session.path);
  meta.innerHTML =
    `<span>${session.command || "zsh"}</span>` +
    `<span class="tile-path">${path}</span>` +
    `<span>${timeAgo(created)}</span>`;

  tile.append(close, name, canvas, meta);
  tile.addEventListener("click", (e) => {
    // Click on the name span starts rename; don't navigate.
    if (e.target === name) return;
    handlers.onClick?.(session.name);
  });
  return tile;
}

export function createNewTile({ onCreate }) {
  const tile = el("div", "home-tile home-tile-new");
  tile.innerHTML = '<span class="tile-plus">+</span>';
  tile.addEventListener("click", () => onCreate?.());
  return tile;
}

// Internal: swap the name span for an input until commit/escape.
function startRename(nameEl, currentName, onCommit) {
  const input = InputMode.createHwkbInput("tile-rename");
  input.value = currentName;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let cancelled = false;
  const finish = async () => {
    const next = input.value.trim();
    if (cancelled || !next || next === currentName) {
      input.replaceWith(nameEl);
      return;
    }
    await onCommit?.(next);
    // Caller is expected to re-render the grid; if it doesn't, swap back.
    if (input.isConnected) input.replaceWith(nameEl);
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    else if (e.key === "Escape") { cancelled = true; input.blur(); }
  });
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

if (typeof window !== "undefined") {
  window.Tile = { createSessionTile, createNewTile };
}
