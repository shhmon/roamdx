// Pure scroll physics — extracted from Scroll.init for testability.
// Simulates iOS UIScrollView's exponential-decay inertia model.

export const TIME_CONSTANT = 325;       // ms — matches iOS UIScrollView.normal
export const STILL_THRESHOLD = 50;      // px/s below which finger is "still"

// Smooth incoming velocity. Hard-decay if the finger is essentially still
// (prevents accidental coast after a slow drag).
export function smoothVelocity(prev, instant, threshold = STILL_THRESHOLD) {
  if (Math.abs(instant) < threshold) return prev * 0.5;
  return 0.8 * prev + 0.2 * instant;
}

// Coast distance projection — how far the scroll will continue after release.
// 0.8 dampening factor approximates UIKit's deceleration curve.
export function projectAmplitude(velocityPxPerSec, timeConstantMs = TIME_CONSTANT) {
  return (0.8 * velocityPxPerSec / 1000) * timeConstantMs;
}

// Position offset at time t after release (in ms), given initial amplitude.
// Amplitude is the projected total distance; this returns how far we still
// have to travel from `target` (i.e. the unfinished portion).
export function inertiaDelta(amplitude, elapsedMs, timeConstantMs = TIME_CONSTANT) {
  return -amplitude * Math.exp(-elapsedMs / timeConstantMs);
}

if (typeof window !== "undefined") {
  window.ScrollPhysics = { smoothVelocity, projectAmplitude, inertiaDelta };
}
