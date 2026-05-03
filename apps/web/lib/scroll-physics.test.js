import { describe, it, expect } from "vitest";
import { smoothVelocity, projectAmplitude, inertiaDelta, TIME_CONSTANT } from "./scroll-physics.js";

describe("smoothVelocity", () => {
  it("hard-decays when finger is nearly still", () => {
    // |instant| < threshold (default 50) → prev * 0.5
    expect(smoothVelocity(100, 10)).toBe(50);
    expect(smoothVelocity(200, -20)).toBe(100);
  });

  it("smooths when finger is moving", () => {
    // 0.8 * prev + 0.2 * instant
    expect(smoothVelocity(0, 1000)).toBeCloseTo(200);
    expect(smoothVelocity(500, 1000)).toBeCloseTo(0.8 * 500 + 0.2 * 1000);
  });

  it("respects custom threshold", () => {
    // With threshold 200, instant=100 is "still"
    expect(smoothVelocity(80, 100, 200)).toBe(40);
  });
});

describe("projectAmplitude", () => {
  it("scales with velocity", () => {
    expect(projectAmplitude(0)).toBe(0);
    const a1 = projectAmplitude(1000);
    const a2 = projectAmplitude(2000);
    expect(a2).toBeCloseTo(a1 * 2);
  });

  it("preserves sign", () => {
    expect(projectAmplitude(1000)).toBeGreaterThan(0);
    expect(projectAmplitude(-1000)).toBeLessThan(0);
  });
});

describe("inertiaDelta", () => {
  it("starts near -amplitude at t=0", () => {
    // delta(0) = -amp * exp(0) = -amp
    expect(inertiaDelta(100, 0)).toBeCloseTo(-100);
  });

  it("decays exponentially", () => {
    const d1 = Math.abs(inertiaDelta(100, TIME_CONSTANT));
    const d2 = Math.abs(inertiaDelta(100, TIME_CONSTANT * 2));
    // After one time-constant, magnitude ≈ amp/e ≈ 36.78
    expect(d1).toBeCloseTo(100 / Math.E, 1);
    // After two time-constants, magnitude ≈ amp/e²
    expect(d2).toBeCloseTo(100 / (Math.E * Math.E), 1);
  });

  it("approaches zero as t → ∞", () => {
    expect(Math.abs(inertiaDelta(100, 100000))).toBeLessThan(0.001);
  });
});
