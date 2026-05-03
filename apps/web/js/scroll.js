// Touch-driven kinetic scroll for the tmux scroll zone.
// Translates finger movement into tmux mouse-wheel events with iOS-style inertia.

const Scroll = {
  TIME_CONSTANT: 325, // ms — matches iOS UIScrollView.normal
  LINE_HEIGHT: 30,    // px of finger movement per scroll line
  STILL_THRESHOLD: 50, // px/s below which we treat finger as "still"

  init(terminalManager) {
    const zone = document.getElementById("scroll-zone");
    if (!zone) return;

    const tm = terminalManager;
    let lastY = null;
    let lastTime = 0;
    let velocity = 0;
    let accum = 0;
    let amplitude = 0;
    let target = 0;
    let position = 0;
    let timestamp = 0;
    let inertiaFrame = null;

    const sendScroll = (up) => {
      const btn = up ? 97 : 96;
      tm.send({ type: "input", data: `\x1b[M${String.fromCharCode(btn)}\x21\x21` });
    };

    const flushLines = () => {
      while (Math.abs(accum) >= this.LINE_HEIGHT) {
        sendScroll(accum > 0);
        accum -= accum > 0 ? this.LINE_HEIGHT : -this.LINE_HEIGHT;
      }
    };

    const inertia = () => {
      const elapsed = Date.now() - timestamp;
      const delta = -amplitude * Math.exp(-elapsed / this.TIME_CONSTANT);
      if (Math.abs(delta) > 0.5) {
        const newPos = target + delta;
        accum += newPos - position;
        position = newPos;
        flushLines();
        inertiaFrame = requestAnimationFrame(inertia);
      }
    };

    zone.addEventListener("touchstart", (e) => {
      if (inertiaFrame) cancelAnimationFrame(inertiaFrame);
      lastY = e.touches[0].clientY;
      lastTime = Date.now();
      velocity = 0;
      accum = 0;
      position = 0;
      e.preventDefault();
    });

    zone.addEventListener("touchmove", (e) => {
      if (lastY === null) return;
      e.preventDefault();
      const now = Date.now();
      const dy = lastY - e.touches[0].clientY;
      const dt = Math.max(now - lastTime, 1);
      const instant = dy / dt * 1000;
      // Finger nearly still → decay velocity hard. Moving → smooth.
      if (Math.abs(instant) < this.STILL_THRESHOLD) {
        velocity *= 0.5;
      } else {
        velocity = 0.8 * velocity + 0.2 * instant;
      }
      lastY = e.touches[0].clientY;
      lastTime = now;
      accum += dy;
      position += dy;
      flushLines();
    });

    zone.addEventListener("touchend", () => {
      lastY = null;
      amplitude = 0.8 * velocity / 1000 * this.TIME_CONSTANT; // projected coast distance
      target = Math.round(position + amplitude);
      timestamp = Date.now();
      inertiaFrame = requestAnimationFrame(inertia);
    });
  },
};
