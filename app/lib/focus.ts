const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside a modal dialog. Bind on the dialog element's keydown.tab. */
export function trapFocus(event: KeyboardEvent, root: HTMLElement | null | undefined) {
  if (!root || event.key !== 'Tab') return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(focusable)).filter(el => el.offsetParent !== null || el === document.activeElement);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}
