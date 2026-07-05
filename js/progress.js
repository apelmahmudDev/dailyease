/**
 * progress.js
 * Turns a task list into a completion percentage and a short caption
 * for the sun-arc header.
 */

export function calculatePercent(tasks) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}

/** A short, encouraging line next to the progress bar. */
export function progressCaption(tasks, percent) {
  if (tasks.length === 0) {
    return "Add a task below to plan your day.";
  }
  if (percent === 100) {
    return "All done! Great job today.";
  }
  if (percent === 0) {
    return "Nothing checked off yet — let's begin.";
  }
  if (percent >= 70) {
    return "Great progress! Keep going and finish strong.";
  }
  if (percent >= 30) {
    return "Good momentum — keep it up.";
  }
  return "Just getting started — you've got this.";
}
