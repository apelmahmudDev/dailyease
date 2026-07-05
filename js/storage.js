const STORAGE_KEY = "dailyease:day:v1";

function defaultTasks() {
  return [];
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
