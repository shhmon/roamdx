import { describe, it, expect } from "vitest";
import { timeAgo, shortPath } from "./format.js";

describe("timeAgo", () => {
  const now = new Date("2026-01-01T00:00:00Z").getTime();

  it("returns 'just now' under a minute", () => {
    expect(timeAgo(new Date(now - 30 * 1000), now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(timeAgo(new Date(now - 5 * 60 * 1000), now)).toBe("5m ago");
  });

  it("returns hours for under a day", () => {
    expect(timeAgo(new Date(now - 3 * 60 * 60 * 1000), now)).toBe("3h ago");
  });

  it("returns days otherwise", () => {
    expect(timeAgo(new Date(now - 2 * 24 * 60 * 60 * 1000), now)).toBe("2d ago");
  });
});

describe("shortPath", () => {
  it("collapses macOS home dir", () => {
    expect(shortPath("/Users/shabo/dev/roamdx")).toBe("~/dev/roamdx");
  });

  it("collapses Linux home dir", () => {
    expect(shortPath("/home/alice/work")).toBe("~/work");
  });

  it("returns empty for falsy input", () => {
    expect(shortPath("")).toBe("");
    expect(shortPath(null)).toBe("");
  });

  it("leaves unrelated paths alone", () => {
    expect(shortPath("/etc/hosts")).toBe("/etc/hosts");
  });
});
