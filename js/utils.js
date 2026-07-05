/**
 * utils.js
 * Small, dependency-free helper functions shared across modules.
 */

/** Generate a reasonably unique id without external dependencies. */
export function generateId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns today's date as YYYY-MM-DD, using local time. */
export function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Human readable date, e.g. "Sunday, 5 July". */
export function formatFriendlyDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Format a Date/timestamp as a short local time, e.g. "9:41 AM". */
export function formatTime(input) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Escape text before it is ever inserted via innerHTML. */
export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/** Debounce: delay invoking fn until `wait` ms after the last call. */
export function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
