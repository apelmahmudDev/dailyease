/**
 * storage.js
 * Owns all reads/writes to localStorage. Nothing outside this file
 * should call localStorage directly — that keeps the storage schema
 * (and any future migration) in one place.
 */

import { todayKey } from "./utils.js";

const STORAGE_KEY = "dailyease:day:v1";
const DEFAULT_NOTE = "Focus on progress,\nnot perfection.\nSmall steps every day\nlead to big changes.";

function taskTime(hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

function defaultTasks() {
  return [
    { id: "static-morning-workout", text: "Morning workout", priority: "low", done: true, createdAt: taskTime(7, 0) },
    { id: "static-read-book", text: "Read 15 pages of a book", priority: "medium", done: true, createdAt: taskTime(8, 30) },
    { id: "static-project-proposal", text: "Finish project proposal", priority: "high", done: false, createdAt: taskTime(10, 0) },
    { id: "static-team-meeting", text: "Team meeting", priority: "medium", done: false, createdAt: taskTime(11, 30) },
    { id: "static-lunch-break", text: "Lunch break", priority: "low", done: false, createdAt: taskTime(13, 0) },
    { id: "static-client-call", text: "Client call", priority: "high", done: false, createdAt: taskTime(14, 30) },
    { id: "static-plan-tomorrow", text: "Plan tomorrow", priority: "low", done: false, createdAt: taskTime(17, 0) },
    { id: "static-evening-walk", text: "Evening walk", priority: "low", done: false, createdAt: taskTime(19, 0) },
  ];
}

/** Shape of a brand-new, empty day. */
function blankDay() {
  return {
    date: todayKey(),
    tasks: defaultTasks(),
    note: DEFAULT_NOTE,
    mood: "happy",
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
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultTasks(),
        note: typeof parsed.note === "string" && parsed.note.length > 0 ? parsed.note : DEFAULT_NOTE,
        mood: parsed.mood ?? "happy",
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
  const fresh = {
    date: todayKey(),
    tasks: [],
    note: "",
    mood: null,
  };
  saveDay(fresh);
  return fresh;
}
