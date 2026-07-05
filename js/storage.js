/**
 * storage.js
 * Owns all reads/writes to localStorage. Nothing outside this file
 * should call localStorage directly — that keeps the storage schema
 * (and any future migration) in one place.
 */

import { todayKey } from "./utils.js";

const STORAGE_KEY = "dailyease:day:v1";

/** Shape of a brand-new, empty day. */
function blankDay() {
  return {
    date: todayKey(),
    tasks: [],
    note: "",
    mood: null,
  };
}

/**
 * Load the saved day from localStorage.
 * If the saved data belongs to a previous date, a fresh day is returned
 * instead — DailyEase is a "today" tool, so yesterday's checklist should
 * not silently carry over.
 * Returns { day, isNewDay } so the caller can react (e.g. show a toast).
 */
export function loadDay() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn("DailyEase: localStorage unavailable", err);
    return { day: blankDay(), isNewDay: true, storageBlocked: true };
  }

  if (!raw) {
    return { day: blankDay(), isNewDay: true };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== todayKey()) {
      return { day: blankDay(), isNewDay: true };
    }
    return {
      day: {
        date: parsed.date,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        note: typeof parsed.note === "string" ? parsed.note : "",
        mood: parsed.mood ?? null,
      },
      isNewDay: false,
    };
  } catch (err) {
    console.warn("DailyEase: corrupted save, starting fresh", err);
    return { day: blankDay(), isNewDay: true };
  }
}

/** Persist the given day object as-is. */
export function saveDay(day) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
    return true;
  } catch (err) {
    console.warn("DailyEase: could not save", err);
    return false;
  }
}

/** Wipe today's data and return a fresh blank day. */
export function resetDay() {
  const fresh = blankDay();
  saveDay(fresh);
  return fresh;
}
