const STORAGE_KEY = "dailyease:day:v1";

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

function blankDay() {
  return {
    date: todayKey(),
    tasks: defaultTasks(),
    note: DEFAULT_NOTE,
    mood: "happy",
  };
}

function loadDay() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn("DailyEase: localStorage unavailable", err);
    return { day: blankDay(), isNewDay: true, storageBlocked: true };
  }

  if (!raw) return { day: blankDay(), isNewDay: true, storageBlocked: false };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== todayKey()) {
      return { day: blankDay(), isNewDay: true, storageBlocked: false };
    }

    return {
      day: {
        date: parsed.date,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultTasks(),
        note: typeof parsed.note === "string" && parsed.note.length > 0 ? parsed.note : DEFAULT_NOTE,
        mood: parsed.mood ?? "happy",
      },
      isNewDay: false,
      storageBlocked: false,
    };
  } catch (err) {
    console.warn("DailyEase: corrupted save, starting fresh", err);
    return { day: blankDay(), isNewDay: true, storageBlocked: false };
  }
}

function saveDay(day) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
    return true;
  } catch (err) {
    console.warn("DailyEase: could not save", err);
    return false;
  }
}

function resetDay() {
  const fresh = {
    date: todayKey(),
    tasks: [],
    note: "",
    mood: null,
  };
  saveDay(fresh);
  return fresh;
}
