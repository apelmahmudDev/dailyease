/**
 * DailyEase standalone runtime.
 * Kept dependency-free so index.html works when opened directly from disk.
 */

const STORAGE_KEY = "dailyease:day:v1";
const DEFAULT_NOTE = "Focus on progress,\nnot perfection.\nSmall steps every day\nlead to big changes.";
const PRIORITIES = ["low", "medium", "high"];
const MOODS = [
  { id: "stressed", emoji: "&#128543;", label: "Stressed" },
  { id: "tired", emoji: "&#128533;", label: "Tired" },
  { id: "calm", emoji: "&#128578;", label: "Calm" },
  { id: "happy", emoji: "&#128522;", label: "Good" },
  { id: "focused", emoji: "&#129321;", label: "Great" },
];

const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function generateId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
        tasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : defaultTasks(),
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
  const fresh = blankDay();
  saveDay(fresh);
  return fresh;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatTime(input) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function createTask(text, priority = "medium", details = {}) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Task text cannot be empty");
  const safePriority = PRIORITIES.includes(priority) ? priority : "medium";
  return {
    id: generateId(),
    text: trimmed,
    priority: safePriority,
    done: false,
    createdAt: details.createdAt ?? Date.now(),
    description: details.description ?? "",
    category: details.category ?? "",
    reminder: details.reminder ?? "",
    tag: details.tag ?? "",
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

function filterByStatus(tasks, status) {
  if (status === "active") return tasks.filter((task) => !task.done);
  if (status === "completed") return tasks.filter((task) => task.done);
  return tasks;
}

function sortForDisplay(tasks) {
  return [...tasks];
}

function taskCounts(tasks) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  return { total, done, remaining: total - done };
}

function calculatePercent(tasks) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100);
}

function progressCaption(tasks, percent) {
  if (tasks.length === 0) return "Add a task below to plan your day.";
  if (percent === 100) return "All done! Great job today.";
  if (percent === 0) return "Nothing checked off yet - let's begin.";
  if (percent >= 70) return "Great progress! Keep going and finish strong.";
  if (percent >= 30) return "Good momentum - keep it up.";
  return "Just getting started - you've got this.";
}

const { day, isNewDay, storageBlocked } = loadDay();
const state = {
  day,
  selectedPriority: "medium",
  filter: "all",
  editingId: null,
  drawerMode: "create",
  drawerTaskId: null,
  actionMenuTaskId: null,
};

const el = {
  brandDate: document.getElementById("brandDate"),
  brandWeekday: document.getElementById("brandWeekday"),
  heroAddBtn: document.getElementById("heroAddBtn"),

  taskDrawerOverlay: document.getElementById("taskDrawerOverlay"),
  drawerCloseBtn: document.getElementById("drawerCloseBtn"),
  drawerCancelBtn: document.getElementById("drawerCancelBtn"),
  drawerTaskForm: document.getElementById("drawerTaskForm"),
  drawerTaskTitle: document.getElementById("drawerTaskTitle"),
  drawerTaskDesc: document.getElementById("drawerTaskDesc"),
  drawerTaskTime: document.getElementById("drawerTaskTime"),
  drawerTaskCategory: document.getElementById("drawerTaskCategory"),
  drawerTaskReminder: document.getElementById("drawerTaskReminder"),
  drawerTaskTag: document.getElementById("drawerTaskTag"),
  drawerTitleCount: document.getElementById("drawerTitleCount"),
  drawerDescCount: document.getElementById("drawerDescCount"),
  drawerTitle: document.getElementById("drawerTitle"),
  drawerSaveBtn: document.querySelector(".drawer-save"),
  taskActionMenu: document.getElementById("taskActionMenu"),

  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  prioritySelect: document.getElementById("prioritySelect"),
  filterSelect: document.getElementById("filterSelect"),
  taskList: document.getElementById("taskList"),

  moodGrid: document.getElementById("moodGrid"),
  moodCaption: document.getElementById("moodCaption"),

  noteInput: document.getElementById("noteInput"),
  noteCount: document.getElementById("noteCount"),

  ringFill: document.getElementById("ringFill"),
  ringPercent: document.getElementById("ringPercent"),
  progressMessage: document.getElementById("progressMessage"),
  progressBarFill: document.getElementById("progressBarFill"),
  progressStat: document.getElementById("progressStat"),

  statTotal: document.getElementById("statTotal"),
  statDone: document.getElementById("statDone"),
  statPending: document.getElementById("statPending"),

  saveBtn: document.getElementById("saveBtn"),
  resetBtnTop: document.getElementById("resetBtnTop"),
  resetOverlay: document.getElementById("resetOverlay"),
  cancelReset: document.getElementById("cancelReset"),
  confirmReset: document.getElementById("confirmReset"),

  toast: document.getElementById("toast"),
};

const ICONS = {
  check: `<svg viewBox="0 0 13 13" fill="none"><path d="M1.5 6.7L4.8 10l7-8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/></svg>`,
  menu: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 5.2h.01M10 10h.01M10 14.8h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
};

function persist() {
  saveDay(state.day);
}

function persistWithFeedback(label = "Saved") {
  persist();
  showToast(label);
}

function renderDate() {
  const today = new Date();
  el.brandDate.textContent = today.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  el.brandWeekday.textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
  });
}

function renderTasks() {
  closeTaskActionMenu();
  const tasks = state.day.tasks;
  const visible = sortForDisplay(filterByStatus(tasks, state.filter));

  if (tasks.length === 0) {
    el.taskList.innerHTML = emptyStateMarkup(
      "Nothing planned yet",
      "Add your first task above to shape the day."
    );
  } else if (visible.length === 0) {
    el.taskList.innerHTML = emptyStateMarkup(
      "No tasks here",
      "Try a different filter, or add a new task."
    );
  } else {
    el.taskList.innerHTML = visible.map(taskRowMarkup).join("");
  }

  renderProgress(tasks);
  renderSummary(tasks);
}

function emptyStateMarkup(title, subtitle) {
  return `
    <li class="empty-state">
      ${ICONS.empty}
      <p>${title}</p>
      <p>${subtitle}</p>
    </li>`;
}

function taskRowMarkup(task) {
  const isEditing = state.editingId === task.id;
  const body = isEditing
    ? `<input class="task-edit-input" id="editInput-${task.id}" type="text" maxlength="140" value="${escapeHtml(task.text)}" />`
    : `<p class="task-text">${escapeHtml(task.text)}<span class="task-time">${formatTime(task.createdAt)}</span></p>`;

  const actions = isEditing
    ? `<button type="button" class="btn btn-primary" data-action="save-edit" style="padding:0.4rem 0.8rem;">Save</button>
       <button type="button" class="btn btn-outline" data-action="cancel-edit" style="padding:0.4rem 0.8rem;">Cancel</button>`
    : `<span class="priority-tag" data-priority="${task.priority}">${capitalize(task.priority)}</span>
       <button type="button" class="btn-icon task-menu-btn" data-action="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Task options">${ICONS.menu}</button>`;

  return `
    <li class="task-row ${task.done ? "is-done" : ""}" data-id="${task.id}">
      <button type="button" class="task-check" aria-pressed="${task.done}" aria-label="${task.done ? "Mark task not done" : "Mark task done"}" data-action="toggle">
        ${ICONS.check}
      </button>
      <div class="task-body">${body}</div>
      <div class="task-actions">${actions}</div>
    </li>`;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderProgress(tasks) {
  const percent = calculatePercent(tasks);
  const { total, done } = taskCounts(tasks);

  el.ringPercent.textContent = `${percent}%`;
  el.progressMessage.textContent = progressCaption(tasks, percent);
  el.progressBarFill.style.width = `${percent}%`;
  el.progressStat.textContent = `${done} of ${total} task${total === 1 ? "" : "s"} completed`;

  const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  el.ringFill.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  el.ringFill.style.strokeDashoffset = `${offset}`;
}

function renderSummary(tasks) {
  const { total, done, remaining } = taskCounts(tasks);
  el.statTotal.textContent = total;
  el.statDone.textContent = done;
  el.statPending.textContent = remaining;
}

function renderMood() {
  const selectedMood = MOODS.find((mood) => mood.id === state.day.mood);
  el.moodGrid.innerHTML = MOODS.map((mood) => {
    const pressed = state.day.mood === mood.id;
    return `
      <button type="button" class="mood-btn" data-mood="${mood.id}" aria-pressed="${pressed}">
        <span class="mood-emoji" aria-hidden="true">${mood.emoji}</span>
        <span class="mood-name">${mood.label}</span>
      </button>`;
  }).join("");
  el.moodCaption.textContent = selectedMood?.label ?? "How are you feeling today?";
}

function renderNote() {
  el.noteInput.value = state.day.note;
  el.noteCount.textContent = `${state.day.note.length}/200`;
}

function renderAll() {
  renderDate();
  renderTasks();
  renderMood();
  renderNote();
}

let toastTimeout = null;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.toast.classList.remove("is-visible"), 2000);
}

function updateDrawerCounts() {
  el.drawerTitleCount.textContent = `${el.drawerTaskTitle.value.length}/100`;
  el.drawerDescCount.textContent = `${el.drawerTaskDesc.value.length}/200`;
}

function resetDrawerForm() {
  el.drawerTaskForm.reset();
  const medium = el.drawerTaskForm.querySelector('[name="drawerPriority"][value="medium"]');
  if (medium) medium.checked = true;
  updateDrawerCounts();
}

function setDrawerPriority(priority) {
  const input = el.drawerTaskForm.querySelector(`[name="drawerPriority"][value="${priority}"]`);
  if (input) input.checked = true;
}

function timeValueFromTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function openTaskDrawer(task = null) {
  if (task) {
    state.drawerMode = "edit";
    state.drawerTaskId = task.id;
    el.drawerTitle.textContent = "Edit Task";
    el.drawerSaveBtn.lastChild.textContent = " Save Changes";
    el.drawerTaskTitle.value = task.text ?? "";
    el.drawerTaskDesc.value = task.description ?? "";
    el.drawerTaskTime.value = timeValueFromTimestamp(task.createdAt);
    el.drawerTaskCategory.value = task.category ?? "";
    el.drawerTaskReminder.value = task.reminder ?? "";
    el.drawerTaskTag.value = task.tag ?? "";
    setDrawerPriority(task.priority ?? "medium");
  } else {
    state.drawerMode = "create";
    state.drawerTaskId = null;
    el.drawerTitle.textContent = "Add New Task";
    el.drawerSaveBtn.lastChild.textContent = " Save Task";
    resetDrawerForm();
  }
  el.taskDrawerOverlay.classList.add("is-open");
  el.taskDrawerOverlay.setAttribute("aria-hidden", "false");
  updateDrawerCounts();
  el.drawerTaskTitle.focus();
}

function closeTaskDrawer() {
  el.taskDrawerOverlay.classList.remove("is-open");
  el.taskDrawerOverlay.setAttribute("aria-hidden", "true");
  state.drawerMode = "create";
  state.drawerTaskId = null;
  el.heroAddBtn.focus();
}

function timestampFromTime(value) {
  if (!value) return Date.now();
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Date.now();
  return taskTime(hours, minutes);
}

el.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!el.taskInput.value.trim()) {
    el.taskInput.focus();
    return;
  }
  state.day.tasks.push(createTask(el.taskInput.value, el.prioritySelect.value));
  el.taskInput.value = "";
  renderTasks();
  persist();
});

el.heroAddBtn.addEventListener("click", () => openTaskDrawer());
el.drawerCloseBtn.addEventListener("click", closeTaskDrawer);
el.drawerCancelBtn.addEventListener("click", closeTaskDrawer);

el.taskDrawerOverlay.addEventListener("click", (e) => {
  if (e.target === el.taskDrawerOverlay) closeTaskDrawer();
});

el.drawerTaskTitle.addEventListener("input", updateDrawerCounts);
el.drawerTaskDesc.addEventListener("input", updateDrawerCounts);

el.drawerTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!el.drawerTaskTitle.value.trim()) {
    el.drawerTaskTitle.focus();
    return;
  }

  const form = new FormData(el.drawerTaskForm);
  const priority = form.get("drawerPriority") ?? "medium";
  const taskData = {
    description: el.drawerTaskDesc.value.trim(),
    createdAt: timestampFromTime(el.drawerTaskTime.value),
    category: el.drawerTaskCategory.value,
    reminder: el.drawerTaskReminder.value,
    tag: el.drawerTaskTag.value.trim(),
  };

  if (state.drawerMode === "edit" && state.drawerTaskId) {
    state.day.tasks = state.day.tasks.map((task) =>
      task.id === state.drawerTaskId
        ? {
            ...task,
            text: el.drawerTaskTitle.value.trim(),
            priority,
            ...taskData,
          }
        : task
    );
    showToast("Task updated.");
  } else {
    state.day.tasks.push(createTask(el.drawerTaskTitle.value, priority, taskData));
    showToast("Task saved.");
  }

  resetDrawerForm();
  updateDrawerCounts();
  closeTaskDrawer();
  renderTasks();
  persist();
});

el.filterSelect.addEventListener("change", () => {
  state.filter = el.filterSelect.value;
  renderTasks();
});

el.taskList.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;
  const row = actionBtn.closest(".task-row");
  if (!row) return;
  const id = row.dataset.id;
  const action = actionBtn.dataset.action;

  if (action === "toggle") {
    state.day.tasks = toggleTask(state.day.tasks, id);
    renderTasks();
    persist();
  }

  if (action === "menu") {
    e.stopPropagation();
    toggleTaskActionMenu(id, actionBtn);
  }

  if (action === "delete") {
    state.day.tasks = removeTask(state.day.tasks, id);
    renderTasks();
    persist();
  }

  if (action === "edit") {
    state.editingId = id;
    renderTasks();
    const input = document.getElementById(`editInput-${id}`);
    if (input) {
      input.focus();
      input.select();
    }
  }

  if (action === "cancel-edit") {
    state.editingId = null;
    renderTasks();
  }

  if (action === "save-edit") {
    const input = document.getElementById(`editInput-${id}`);
    if (input) state.day.tasks = editTaskText(state.day.tasks, id, input.value);
    state.editingId = null;
    renderTasks();
    persist();
  }
});

function closeTaskActionMenu() {
  if (!el.taskActionMenu) return;
  el.taskActionMenu.hidden = true;
  state.actionMenuTaskId = null;
  document.querySelectorAll(".task-menu-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function toggleTaskActionMenu(taskId, anchor) {
  if (!el.taskActionMenu) return;
  if (!el.taskActionMenu.hidden && state.actionMenuTaskId === taskId) {
    closeTaskActionMenu();
    return;
  }

  state.actionMenuTaskId = taskId;
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 160;
  const left = Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth);
  const top = Math.min(window.innerHeight - 104, rect.bottom + 8);
  el.taskActionMenu.style.left = `${Math.max(12, left)}px`;
  el.taskActionMenu.style.top = `${Math.max(12, top)}px`;
  el.taskActionMenu.hidden = false;
  document.querySelectorAll(".task-menu-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
  anchor.setAttribute("aria-expanded", "true");
}

el.taskActionMenu.addEventListener("click", (e) => {
  const button = e.target.closest("[data-menu-action]");
  if (!button || !state.actionMenuTaskId) return;
  const action = button.dataset.menuAction;
  const taskId = state.actionMenuTaskId;
  const task = state.day.tasks.find((item) => item.id === taskId);
  closeTaskActionMenu();

  if (action === "edit" && task) {
    openTaskDrawer(task);
  }

  if (action === "delete") {
    state.day.tasks = removeTask(state.day.tasks, taskId);
    renderTasks();
    persist();
    showToast("Task deleted.");
  }
});

document.addEventListener("click", (e) => {
  if (
    el.taskActionMenu.hidden ||
    e.target.closest(".task-action-menu") ||
    e.target.closest(".task-menu-btn")
  ) {
    return;
  }
  closeTaskActionMenu();
});

el.taskList.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("task-edit-input")) return;
  const row = e.target.closest(".task-row");
  const id = row?.dataset.id;
  if (!id) return;

  if (e.key === "Enter") {
    e.preventDefault();
    state.day.tasks = editTaskText(state.day.tasks, id, e.target.value);
    state.editingId = null;
    renderTasks();
    persist();
  }
  if (e.key === "Escape") {
    state.editingId = null;
    renderTasks();
  }
});

el.moodGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".mood-btn");
  if (!btn) return;
  const moodId = btn.dataset.mood;
  state.day.mood = state.day.mood === moodId ? null : moodId;
  renderMood();
  persist();
});

const persistNoteDebounced = debounce(() => persist(), 400);
el.noteInput.addEventListener("input", () => {
  state.day.note = el.noteInput.value;
  el.noteCount.textContent = `${state.day.note.length}/200`;
  persistNoteDebounced();
});

el.saveBtn.addEventListener("click", () => {
  persistWithFeedback("Day saved.");
});

function openResetDialog() {
  el.resetOverlay.classList.add("is-open");
  el.cancelReset.focus();
}

function closeResetDialog() {
  el.resetOverlay.classList.remove("is-open");
}

el.resetBtnTop.addEventListener("click", openResetDialog);
el.cancelReset.addEventListener("click", closeResetDialog);

el.resetOverlay.addEventListener("click", (e) => {
  if (e.target === el.resetOverlay) closeResetDialog();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el.taskActionMenu.hidden) {
    closeTaskActionMenu();
  }
  if (e.key === "Escape" && el.resetOverlay.classList.contains("is-open")) {
    closeResetDialog();
  }
  if (e.key === "Escape" && el.taskDrawerOverlay.classList.contains("is-open")) {
    closeTaskDrawer();
  }
});

el.confirmReset.addEventListener("click", () => {
  state.day = resetDay();
  state.filter = "all";
  state.editingId = null;
  el.filterSelect.value = "all";
  closeResetDialog();
  renderAll();
  showToast("Fresh day started.");
});

renderAll();
persist();
updateDrawerCounts();

if (storageBlocked) {
  showToast("Storage unavailable - changes won't be saved.");
} else if (isNewDay) {
  showToast("New day, ready to plan.");
}
