function createTask(text, priority = "medium", details = {}) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Task text cannot be empty");

  return {
    id: generateId(),
    text: trimmed,
    priority: PRIORITIES.includes(priority) ? priority : "medium",
    done: false,
    createdAt: details.createdAt ?? Date.now(),
    reminder: details.reminder ?? "",
  };
}

function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task
  );
}

function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

function editTaskText(tasks, id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return tasks;
  return tasks.map((task) =>
    task.id === id ? { ...task, text: trimmed } : task
  );
}

function taskCounts(tasks) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  return { total, done };
}
