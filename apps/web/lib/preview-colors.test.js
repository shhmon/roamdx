import { describe, it, expect } from "vitest";
import { extractColors, hashName } from "./preview-colors.js";

describe("extractColors", () => {
  it("returns empty array for blank content", () => {
    expect(extractColors("")).toEqual([]);
    expect(extractColors("   \n   ")).toEqual([]);
  });

  it("extracts basic ANSI fg colors", () => {
    // \x1b[31m = red, \x1b[32m = green
    const out = extractColors("\x1b[31mA\x1b[32mB");
    expect(out).toEqual(["#f2767c", "#9BE17D"]);
  });

  it("skips theme-default colors", () => {
    // \x1b[37m white = default fg #c3cfd9 → SKIP
    const out = extractColors("\x1b[37mhi");
    expect(out).toEqual([]);
  });

  it("resets fg on code 0 and 39", () => {
    // After reset, default is white which is in SKIP, so chars after reset are dropped
    const out = extractColors("\x1b[31mA\x1b[0mB");
    expect(out).toEqual(["#f2767c"]);
  });

  it("handles 24-bit truecolor (38;2;R;G;B)", () => {
    const out = extractColors("\x1b[38;2;200;100;50mZ");
    expect(out).toEqual(["rgb(200,100,50)"]);
  });

  it("ignores spaces and control chars", () => {
    const out = extractColors("\x1b[31m   \tA");
    expect(out).toEqual(["#f2767c"]);
  });

  it("handles bright fg (90-97)", () => {
    // \x1b[91m = bright red
    const out = extractColors("\x1b[91mA");
    expect(out).toEqual(["#f85370"]);
  });
});

describe("hashName", () => {
  it("is deterministic", () => {
    expect(hashName("abc")).toBe(hashName("abc"));
  });

  it("returns non-negative integer", () => {
    const h = hashName("some-session-name");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
  });

  it("differs for different inputs", () => {
    expect(hashName("foo")).not.toBe(hashName("bar"));
  });

  it("handles empty string", () => {
    expect(hashName("")).toBe(0);
  });
});
