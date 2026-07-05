function renderDate(el) {
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

function greetingForHour(hour) {
  if (hour < 5) return "Good night!";
  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  if (hour < 21) return "Good evening!";
  return "Good night!";
}

function renderGreeting(el) {
  el.heroGreeting.textContent = greetingForHour(new Date().getHours());
}

function renderTasks(state, el, closeTaskActionMenu) {
  closeTaskActionMenu();
  const tasks = state.day.tasks;
  el.taskList.classList.toggle("is-empty", tasks.length === 0);

  el.taskList.innerHTML = tasks.length === 0
    ? emptyStateMarkup("Nothing planned yet", "Add your first task above to shape the day.")
    : tasks.map((task) => taskRowMarkup(task, state.editingId)).join("");

  renderProgress(tasks, el);
}

function renderProgress(tasks, el) {
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

function renderMood(state, el) {
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

function renderNote(state, el) {
  el.noteInput.value = state.day.note;
  el.noteCount.textContent = `${state.day.note.length}/200`;
}

function renderAll(state, el, closeTaskActionMenu) {
  renderDate(el);
  renderGreeting(el);
  renderTasks(state, el, closeTaskActionMenu);
  renderMood(state, el);
  renderNote(state, el);
}

function emptyStateMarkup(title, subtitle) {
  return `
    <li class="empty-state">
      ${ICONS.empty}
      <p>${title}</p>
      <p>${subtitle}</p>
    </li>`;
}

function taskRowMarkup(task, editingId) {
  const isEditing = editingId === task.id;
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
