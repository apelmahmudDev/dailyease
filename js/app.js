/**
 * app.js
 * Entry point. Owns the in-memory state for "today", renders it to the
 * DOM, and wires up every interaction. Domain logic lives in the other
 * modules — this file is glue, not rules.
 */

import { loadDay, saveDay, resetDay } from "./storage.js";
import {
  createTask,
  toggleTask,
  removeTask,
  editTaskText,
  sortForDisplay,
  filterByStatus,
  taskCounts,
} from "./tasks.js";
import { MOODS } from "./mood.js";
import { calculatePercent, progressCaption } from "./progress.js";
import { escapeHtml, formatFriendlyDate, debounce } from "./utils.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const { day, isNewDay, storageBlocked } = loadDay();
const state = {
  day,
  selectedPriority: "medium",
  filter: "all",
  editingId: null,
};

const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const el = {
  brandDate: document.getElementById("brandDate"),

  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  prioritySelect: document.getElementById("prioritySelect"),
  filterSelect: document.getElementById("filterSelect"),
  taskList: document.getElementById("taskList"),

  moodGrid: document.getElementById("moodGrid"),

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
  edit: `<svg viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m1.5 0-.6 9.4a1.5 1.5 0 0 1-1.5 1.4H8.6a1.5 1.5 0 0 1-1.5-1.4L6.5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/></svg>`,
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function persist() {
  saveDay(state.day);
}

function persistWithFeedback(label = "Saved") {
  persist();
  showToast(label);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderDate() {
  el.brandDate.textContent = `${formatFriendlyDate()}`;
}

function renderTasks() {
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
    ? `<input
         class="task-edit-input"
         id="editInput-${task.id}"
         type="text"
         maxlength="140"
         value="${escapeHtml(task.text)}"
       />`
    : `<p class="task-text">${escapeHtml(task.text)}</p>`;

  const actions = isEditing
    ? `<button type="button" class="btn btn-primary" data-action="save-edit" style="padding:0.4rem 0.8rem;">Save</button>
       <button type="button" class="btn btn-outline" data-action="cancel-edit" style="padding:0.4rem 0.8rem;">Cancel</button>`
    : `<span class="priority-tag" data-priority="${task.priority}">${capitalize(task.priority)}</span>
       <button type="button" class="btn-icon task-edit-btn" data-action="edit" aria-label="Edit task">${ICONS.edit}</button>
       <button type="button" class="btn-icon task-delete-btn" data-action="delete" aria-label="Delete task">${ICONS.trash}</button>`;

  return `
    <li class="task-row ${task.done ? "is-done" : ""}" data-id="${task.id}">
      <button type="button" class="task-check" aria-pressed="${task.done}" aria-label="${
        task.done ? "Mark task not done" : "Mark task done"
      }" data-action="toggle">
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
  el.progressStat.textContent = `Completed ${done} of ${total} task${total === 1 ? "" : "s"}`;

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
  el.moodGrid.innerHTML = MOODS.map((mood) => {
    const pressed = state.day.mood === mood.id;
    return `
      <button
        type="button"
        class="mood-btn"
        data-mood="${mood.id}"
        aria-pressed="${pressed}"
      >
        <span class="mood-emoji" aria-hidden="true">${mood.emoji}</span>
        <span class="mood-name">${mood.label}</span>
      </button>`;
  }).join("");
}

function renderNote() {
  el.noteInput.value = state.day.note;
  el.noteCount.textContent = `${state.day.note.length} / 500`;
}

function renderAll() {
  renderDate();
  renderTasks();
  renderMood();
  renderNote();
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimeout = null;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.toast.classList.remove("is-visible"), 2000);
}

// ---------------------------------------------------------------------------
// Task interactions
// ---------------------------------------------------------------------------

el.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = el.taskInput.value;
  if (!value.trim()) {
    el.taskInput.focus();
    return;
  }
  const task = createTask(value, el.prioritySelect.value);
  state.day.tasks.push(task);
  el.taskInput.value = "";
  renderTasks();
  persist();
  el.taskInput.focus();
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
    if (input) {
      state.day.tasks = editTaskText(state.day.tasks, id, input.value);
    }
    state.editingId = null;
    renderTasks();
    persist();
  }
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

// ---------------------------------------------------------------------------
// Mood interactions
// ---------------------------------------------------------------------------

el.moodGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".mood-btn");
  if (!btn) return;
  const moodId = btn.dataset.mood;
  state.day.mood = state.day.mood === moodId ? null : moodId;
  renderMood();
  persist();
});

// ---------------------------------------------------------------------------
// Note interactions
// ---------------------------------------------------------------------------

const persistNoteDebounced = debounce(() => persist(), 400);

el.noteInput.addEventListener("input", () => {
  state.day.note = el.noteInput.value;
  el.noteCount.textContent = `${state.day.note.length} / 500`;
  persistNoteDebounced();
});

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------

el.saveBtn.addEventListener("click", () => {
  persistWithFeedback("Day saved.");
});

// ---------------------------------------------------------------------------
// Reset flow
// ---------------------------------------------------------------------------

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
  if (e.key === "Escape" && el.resetOverlay.classList.contains("is-open")) {
    closeResetDialog();
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

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

renderAll();

if (storageBlocked) {
  showToast("Storage unavailable — changes won't be saved.");
} else if (isNewDay && state.day.tasks.length === 0) {
  showToast("New day, clean page.");
}
