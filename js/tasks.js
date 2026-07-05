/**
 * tasks.js
 * Pure functions that operate on a task list. None of these touch the
 * DOM or localStorage directly — app.js wires them to both.
 */

import { generateId } from "./utils.js";

export const PRIORITIES = ["low", "medium", "high"];

/** Build a new task object. Throws if the text is empty after trimming. */
export function createTask(text, priority = "medium") {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Task text cannot be empty");
  }
  if (!PRIORITIES.includes(priority)) {
    priority = "medium";
  }
  return {
    id: generateId(),
    text: trimmed,
    priority,
    done: false,
    createdAt: Date.now(),
  };
}

/** Return a new array with the given task's `done` flag flipped. */
export function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task
  );
}

/** Return a new array with the given task removed. */
export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

/** Return a new array with the given task's text replaced. Empty text is ignored. */
export function editTaskText(tasks, id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return tasks;
  return tasks.map((task) =>
    task.id === id ? { ...task, text: trimmed } : task
  );
}

/** Filter tasks by status for the "All / Active / Completed" filter control. */
export function filterByStatus(tasks, status) {
  if (status === "active") return tasks.filter((t) => !t.done);
  if (status === "completed") return tasks.filter((t) => t.done);
  return tasks;
}

/**
 * Sort for display: unfinished before finished, then by priority
 * (high → low), then by creation order. Does not mutate the input.
 */
export function sortForDisplay(tasks) {
  return [...tasks];
}

/** { total, done, remaining } */
export function taskCounts(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { total, done, remaining: total - done };
}
