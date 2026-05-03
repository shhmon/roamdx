import { describe, it, expect } from "vitest";
import { matchKeybinding } from "./keybindings-match.js";

const ev = (overrides) => ({ type: "keydown", key: "", shiftKey: false, ctrlKey: false, metaKey: false, ...overrides });

describe("matchKeybinding", () => {
  it("returns null for non-keydown events", () => {
    expect(matchKeybinding(ev({ type: "keyup", key: "ArrowUp", shiftKey: true }))).toBeNull();
  });

  it("matches Shift+ArrowUp/Down", () => {
    expect(matchKeybinding(ev({ key: "ArrowUp", shiftKey: true }))).toEqual({ id: "scroll-up" });
    expect(matchKeybinding(ev({ key: "ArrowDown", shiftKey: true }))).toEqual({ id: "scroll-down" });
  });

  it("does not match arrows without Shift", () => {
    expect(matchKeybinding(ev({ key: "ArrowUp" }))).toBeNull();
  });

  it("matches Ctrl+D for split-right", () => {
    expect(matchKeybinding(ev({ key: "d", ctrlKey: true }))).toEqual({ id: "split-right" });
    expect(matchKeybinding(ev({ key: "D", ctrlKey: true }))).toEqual({ id: "split-right" });
  });

  it("matches Ctrl+Shift+D for split-down (not split-right)", () => {
    expect(matchKeybinding(ev({ key: "d", ctrlKey: true, shiftKey: true }))).toEqual({ id: "split-down" });
  });

  it("matches Ctrl+Shift+H/J/K/L for pane focus", () => {
    expect(matchKeybinding(ev({ key: "h", ctrlKey: true, shiftKey: true }))).toEqual({ id: "focus-left" });
    expect(matchKeybinding(ev({ key: "j", ctrlKey: true, shiftKey: true }))).toEqual({ id: "focus-down" });
    expect(matchKeybinding(ev({ key: "k", ctrlKey: true, shiftKey: true }))).toEqual({ id: "focus-up" });
    expect(matchKeybinding(ev({ key: "l", ctrlKey: true, shiftKey: true }))).toEqual({ id: "focus-right" });
  });

  it("matches Ctrl+W for close-pane", () => {
    expect(matchKeybinding(ev({ key: "w", ctrlKey: true }))).toEqual({ id: "close-pane" });
  });

  it("matches Ctrl+Shift+Enter for zoom", () => {
    expect(matchKeybinding(ev({ key: "Enter", ctrlKey: true, shiftKey: true }))).toEqual({ id: "zoom" });
  });

  it("ignores Cmd-only modifiers", () => {
    expect(matchKeybinding(ev({ key: "d", metaKey: true }))).toBeNull();
  });
});
