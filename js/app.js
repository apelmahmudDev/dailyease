const { day, isNewDay, storageBlocked } = loadDay();
const THEME_KEY = "dailyease:theme:v1";
const state = {
  day,
  editingId: null,
  drawerMode: "create",
  drawerTaskId: null,
  actionMenuTaskId: null,
};

const el = getElements();
let toastTimeout = null;

function persist() {
  saveDay(state.day);
}

function persistWithFeedback(label = "Saved") {
  persist();
  showToast(label);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.toast.classList.remove("is-visible"), 2000);
}

function loadThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (err) {
    console.warn("DailyEase: theme preference unavailable", err);
    return null;
  }
}

function saveThemePreference(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.warn("DailyEase: could not save theme preference", err);
  }
}

function setTheme(theme, silent = false) {
  const activeTheme = theme === "dark" ? "dark" : "light";
  const isDark = activeTheme === "dark";

  document.documentElement.dataset.theme = activeTheme;
  el.themeToggleBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  el.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  el.themeToggleBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (!silent) showToast(isDark ? "Dark mode on." : "Light mode on.");
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  saveThemePreference(nextTheme);
}

function initTheme() {
  setTheme(loadThemePreference() === "dark" ? "dark" : "light", true);
}

function updateDrawerCounts() {
  el.drawerTitleCount.textContent = `${el.drawerTaskTitle.value.length}/100`;
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

function timestampFromTime(value) {
  if (!value) return Date.now();
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Date.now();
  return taskTime(hours, minutes);
}

function openTaskDrawer(task = null) {
  if (task) {
    state.drawerMode = "edit";
    state.drawerTaskId = task.id;
    el.drawerTitle.textContent = "Edit Task";
    el.drawerSaveBtn.lastChild.textContent = " Save Changes";
    el.drawerTaskTitle.value = task.text ?? "";
    el.drawerTaskTime.value = timeValueFromTimestamp(task.createdAt);
    el.drawerTaskReminder.value = task.reminder ?? "";
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

function closeTaskActionMenu() {
  el.taskActionMenu.hidden = true;
  state.actionMenuTaskId = null;
  document.querySelectorAll(".task-menu-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function toggleTaskActionMenu(taskId, anchor) {
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

function openResetDialog() {
  el.resetOverlay.classList.add("is-open");
  el.cancelReset.focus();
}

function closeResetDialog() {
  el.resetOverlay.classList.remove("is-open");
}

function handleDrawerSubmit(e) {
  e.preventDefault();
  if (!el.drawerTaskTitle.value.trim()) {
    el.drawerTaskTitle.focus();
    return;
  }

  const form = new FormData(el.drawerTaskForm);
  const priority = form.get("drawerPriority") ?? "medium";
  const taskData = {
    createdAt: timestampFromTime(el.drawerTaskTime.value),
    reminder: el.drawerTaskReminder.value,
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
  closeTaskDrawer();
  renderTasks(state, el, closeTaskActionMenu);
  persist();
}

function handleTaskListClick(e) {
  const actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;

  const row = actionBtn.closest(".task-row");
  if (!row) return;

  const id = row.dataset.id;
  const action = actionBtn.dataset.action;

  if (action === "toggle") {
    state.day.tasks = toggleTask(state.day.tasks, id);
    renderTasks(state, el, closeTaskActionMenu);
    persist();
  }

  if (action === "menu") {
    e.stopPropagation();
    toggleTaskActionMenu(id, actionBtn);
  }

  if (action === "cancel-edit") {
    state.editingId = null;
    renderTasks(state, el, closeTaskActionMenu);
  }

  if (action === "save-edit") {
    const input = document.getElementById(`editInput-${id}`);
    if (input) state.day.tasks = editTaskText(state.day.tasks, id, input.value);
    state.editingId = null;
    renderTasks(state, el, closeTaskActionMenu);
    persist();
  }
}

function handleTaskActionMenuClick(e) {
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
    renderTasks(state, el, closeTaskActionMenu);
    persist();
    showToast("Task deleted.");
  }
}

function handleTaskListKeydown(e) {
  if (!e.target.classList.contains("task-edit-input")) return;

  const row = e.target.closest(".task-row");
  const id = row?.dataset.id;
  if (!id) return;

  if (e.key === "Enter") {
    e.preventDefault();
    state.day.tasks = editTaskText(state.day.tasks, id, e.target.value);
    state.editingId = null;
    renderTasks(state, el, closeTaskActionMenu);
    persist();
  }

  if (e.key === "Escape") {
    state.editingId = null;
    renderTasks(state, el, closeTaskActionMenu);
  }
}

function handleDocumentClick(e) {
  if (
    el.taskActionMenu.hidden ||
    e.target.closest(".task-action-menu") ||
    e.target.closest(".task-menu-btn")
  ) {
    return;
  }
  closeTaskActionMenu();
}

function handleDocumentKeydown(e) {
  if (e.key === "Escape" && !el.taskActionMenu.hidden) {
    closeTaskActionMenu();
  }
  if (e.key === "Escape" && el.resetOverlay.classList.contains("is-open")) {
    closeResetDialog();
  }
  if (e.key === "Escape" && el.taskDrawerOverlay.classList.contains("is-open")) {
    closeTaskDrawer();
  }
}

function bindEvents() {
  el.heroAddBtn.addEventListener("click", () => openTaskDrawer());
  el.drawerCloseBtn.addEventListener("click", closeTaskDrawer);
  el.drawerCancelBtn.addEventListener("click", closeTaskDrawer);
  el.taskDrawerOverlay.addEventListener("click", (e) => {
    if (e.target === el.taskDrawerOverlay) closeTaskDrawer();
  });
  el.drawerTaskTitle.addEventListener("input", updateDrawerCounts);
  el.drawerTaskForm.addEventListener("submit", handleDrawerSubmit);

  el.taskList.addEventListener("click", handleTaskListClick);
  el.taskList.addEventListener("keydown", handleTaskListKeydown);
  el.taskActionMenu.addEventListener("click", handleTaskActionMenuClick);
  document.addEventListener("click", handleDocumentClick);

  el.moodGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".mood-btn");
    if (!btn) return;

    const moodId = btn.dataset.mood;
    state.day.mood = state.day.mood === moodId ? null : moodId;
    renderMood(state, el);
    persist();
  });

  const persistNoteDebounced = debounce(() => persist(), 400);
  el.noteInput.addEventListener("input", () => {
    state.day.note = el.noteInput.value;
    el.noteCount.textContent = `${state.day.note.length}/200`;
    persistNoteDebounced();
  });

  el.themeToggleBtn.addEventListener("click", toggleTheme);

  el.resetBtnTop.addEventListener("click", openResetDialog);
  el.cancelReset.addEventListener("click", closeResetDialog);
  el.resetOverlay.addEventListener("click", (e) => {
    if (e.target === el.resetOverlay) closeResetDialog();
  });
  el.confirmReset.addEventListener("click", () => {
    state.day = resetDay();
    state.editingId = null;
    closeResetDialog();
    renderAll(state, el, closeTaskActionMenu);
    showToast("Fresh day started.");
  });

  document.addEventListener("keydown", handleDocumentKeydown);
}

function init() {
  initTheme();
  bindEvents();
  renderAll(state, el, closeTaskActionMenu);
  persist();
  updateDrawerCounts();

  if (storageBlocked) {
    showToast("Storage unavailable - changes won't be saved.");
  } else if (isNewDay) {
    showToast("New day, ready to plan.");
  }
}

init();
