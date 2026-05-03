// Popover primitive: open/close lifecycle, outside-click dismiss, Esc dismiss.
// Caller provides the trigger (button) and content (already-rendered element).
//
// We don't position the content — that stays in CSS, where it belongs. This
// module is purely about the open/close behavior we kept duplicating across
// the FAB menu and tile rename.

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.trigger    - The button that toggles the popover.
 * @param {HTMLElement} opts.content    - The element to show/hide.
 * @param {() => void} [opts.onOpen]    - Called after content is shown.
 * @param {() => void} [opts.onClose]   - Called after content is hidden.
 *
 * Returns { open, close, toggle, isOpen, destroy }.
 */
export function createPopover({ trigger, content, onOpen, onClose }) {
  const HIDDEN = "hidden";
  const OPEN = "open";

  function isOpen() {
    return !content.classList.contains(HIDDEN);
  }

  function open() {
    if (isOpen()) return;
    content.classList.remove(HIDDEN);
    trigger?.classList.add(OPEN);
    onOpen?.();
  }

  function close() {
    if (!isOpen()) return;
    content.classList.add(HIDDEN);
    trigger?.classList.remove(OPEN);
    onClose?.();
  }

  function toggle() {
    isOpen() ? close() : open();
  }

  function onTriggerClick(e) {
    e.stopPropagation();
    toggle();
  }

  function onDocClick(e) {
    if (!isOpen()) return;
    if (content.contains(e.target) || e.target === trigger || trigger?.contains(e.target)) return;
    close();
  }

  function onKeydown(e) {
    if (e.key === "Escape" && isOpen()) close();
  }

  trigger?.addEventListener("click", onTriggerClick);
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);

  function destroy() {
    trigger?.removeEventListener("click", onTriggerClick);
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKeydown);
  }

  return { open, close, toggle, isOpen, destroy };
}

if (typeof window !== "undefined") {
  window.Popover = { createPopover };
}
