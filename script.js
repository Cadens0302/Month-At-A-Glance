const monthLabel = document.getElementById("month-label");
const calendarGrid = document.getElementById("calendar-grid");
const selectedDateLabel = document.getElementById("selected-date-label");
const selectedItems = document.getElementById("selected-items");
const selectedCount = document.getElementById("selected-count");
const itemForm = document.getElementById("item-form");
const titleInput = document.getElementById("title-input");
const timeInput = document.getElementById("time-input");
const noteInput = document.getElementById("note-input");
const sharePreview = document.getElementById("share-preview");
const sharedFeed = document.getElementById("shared-feed");
const allItems = document.getElementById("all-items");
const copyShareButton = document.getElementById("copy-share");
const nativeShareButton = document.getElementById("native-share");
const clearBoardButton = document.getElementById("clear-board");
const eventCount = document.getElementById("event-count");
const taskCount = document.getElementById("task-count");
const openCount = document.getElementById("open-count");
const upcomingCount = document.getElementById("upcoming-count");
const completedCount = document.getElementById("completed-count");
const detailModal = document.getElementById("detail-modal");
const detailType = document.getElementById("detail-type");
const detailTitle = document.getElementById("detail-title");
const detailDate = document.getElementById("detail-date");
const detailTime = document.getElementById("detail-time");
const detailNote = document.getElementById("detail-note");
const detailToggleTask = document.getElementById("detail-toggle-task");

const STORAGE_KEY = "month-at-a-glance-board";
const today = new Date();
today.setHours(0, 0, 0, 0);

const state = {
  currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: formatDateKey(today),
  activeType: "event",
  activeTab: "calendar",
  items: loadItems(),
  activeDetailId: null,
};

seedItems();
bindControls();
render();

function bindControls() {
  document.getElementById("prev-month").addEventListener("click", () => {
    state.currentMonth = new Date(
      state.currentMonth.getFullYear(),
      state.currentMonth.getMonth() - 1,
      1
    );
    render();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    state.currentMonth = new Date(
      state.currentMonth.getFullYear(),
      state.currentMonth.getMonth() + 1,
      1
    );
    render();
  });

  document.getElementById("today-button").addEventListener("click", () => {
    state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDate = formatDateKey(today);
    render();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      renderTabs();
    });
  });

  document.querySelectorAll(".type-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeType = button.dataset.type;
      renderTypeToggle();
    });
  });

  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const note = noteInput.value.trim();
    const time = timeInput.value;

    if (!title) {
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      type: state.activeType,
      title,
      note,
      time,
      date: state.selectedDate,
      done: false,
      sharedAt: new Date().toISOString(),
    };

    state.items.unshift(newItem);
    persistItems();
    itemForm.reset();
    state.activeTab = "overview";
    render();
  });

  copyShareButton.addEventListener("click", async () => {
    const summary = buildShareSummary();
    try {
      await navigator.clipboard.writeText(summary);
      copyShareButton.textContent = "Copied";
      window.setTimeout(() => {
        copyShareButton.textContent = "Copy Summary";
      }, 1400);
    } catch (_error) {
      copyShareButton.textContent = "Copy failed";
    }
  });

  nativeShareButton.addEventListener("click", async () => {
    const summary = buildShareSummary();

    if (!navigator.share) {
      sharePreview.textContent =
        "Sharing is not available in this browser, but you can copy the summary instead.";
      return;
    }

    try {
      await navigator.share({
        title: "Month At A Glance",
        text: summary,
      });
    } catch (_error) {
      // Ignore canceled share sheets.
    }
  });

  clearBoardButton.addEventListener("click", () => {
    state.items = [];
    state.activeDetailId = null;
    persistItems();
    closeModal();
    render();
  });

  detailToggleTask.addEventListener("click", () => {
    if (!state.activeDetailId) {
      return;
    }
    toggleTask(state.activeDetailId);
  });

  document.getElementById("close-modal").addEventListener("click", closeModal);
  detailModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal === "true") {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

function render() {
  normalizeItems();
  renderTabs();
  renderTypeToggle();
  renderMonth();
  renderSelectedDay();
  renderSharedFeed();
  renderOverview();
  renderStats();
  renderDetailModal();
}

function renderTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`);
  });
}

function renderTypeToggle() {
  document.querySelectorAll(".type-toggle").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === state.activeType);
  });
}

function renderMonth() {
  monthLabel.textContent = state.currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  calendarGrid.innerHTML = "";

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const totalCells = 42;

  for (let index = 0; index < totalCells; index += 1) {
    const dayOffset = index - startOffset + 1;
    const inCurrentMonth = dayOffset > 0 && dayOffset <= daysInMonth;
    const cellDate = inCurrentMonth
      ? new Date(year, month, dayOffset)
      : dayOffset <= 0
        ? new Date(year, month - 1, prevMonthDays + dayOffset)
        : new Date(year, month + 1, dayOffset - daysInMonth);
    const dateKey = formatDateKey(cellDate);
    const dayItems = getItemsForDate(dateKey).slice(0, 3);

    const button = document.createElement("button");
    button.className = "day-cell";
    button.type = "button";
    button.setAttribute("aria-label", cellDate.toDateString());

    if (!inCurrentMonth) {
      button.classList.add("muted");
    }

    if (dateKey === state.selectedDate) {
      button.classList.add("selected");
    }

    if (dateKey === formatDateKey(today)) {
      button.classList.add("today");
    }

    const todayMarkup =
      dateKey === formatDateKey(today) ? '<span class="today-pill">Today</span>' : "";

    button.innerHTML = `
      <div class="day-number">
        <span>${cellDate.getDate()}</span>
        ${todayMarkup}
      </div>
      <div class="cell-items">
        ${dayItems
          .map((item) => {
            const statusClass = item.type === "task" && item.done ? "completed" : item.type;
            return `
              <span class="mini-chip ${statusClass}">
                ${item.time ? `${formatTime(item.time)} · ` : ""}${escapeHtml(item.title)}
              </span>
            `;
          })
          .join("")}
      </div>
    `;

    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      state.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
      state.activeTab = "create";
      render();
    });

    calendarGrid.appendChild(button);
  }
}

function renderSelectedDay() {
  const items = getItemsForDate(state.selectedDate);
  const date = parseDateKey(state.selectedDate);
  selectedDateLabel.textContent = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  selectedCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  if (items.length === 0) {
    selectedItems.innerHTML = `
      <div class="empty-state">
        Nothing planned yet for this day. Add an event or task to keep everyone aligned.
      </div>
    `;
    return;
  }

  selectedItems.innerHTML = items
    .map((item) => {
      const completedClass = item.type === "task" && item.done ? "completed" : "";
      return `
        <article class="item-card clickable ${item.type} ${completedClass}" data-open-id="${item.id}">
          <div class="item-top">
            <span class="item-badge">${item.type === "task" && item.done ? "done" : item.type}</span>
            <span class="item-meta">${item.time ? formatTime(item.time) : "Anytime"}</span>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p class="item-note">${item.note ? escapeHtml(item.note) : "Shared with the board for quick visibility."}</p>
        </article>
      `;
    })
    .join("");

  bindOpenDetails(selectedItems);
}

function renderSharedFeed() {
  const recentItems = [...state.items]
    .sort((left, right) => new Date(right.sharedAt) - new Date(left.sharedAt))
    .slice(0, 6);

  sharePreview.textContent = buildShareSummary();

  if (recentItems.length === 0) {
    sharedFeed.innerHTML = `
      <div class="empty-state">
        Your shared feed will appear here once the first item is posted.
      </div>
    `;
    return;
  }

  sharedFeed.innerHTML = recentItems
    .map((item) => {
      const date = parseDateKey(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const badge = item.type === "task" && item.done ? "done" : item.type;
      return `
        <article class="feed-card clickable ${item.type}" data-open-id="${item.id}">
          <div class="feed-card-top">
            <h4>${escapeHtml(item.title)}</h4>
            <span class="item-badge">${badge}</span>
          </div>
          <p class="feed-meta">${date}${item.time ? ` at ${formatTime(item.time)}` : ""}</p>
          <p class="item-note">${item.note ? escapeHtml(item.note) : "Ready to share with the team."}</p>
        </article>
      `;
    })
    .join("");

  bindOpenDetails(sharedFeed);
}

function renderOverview() {
  const sorted = [...state.items].sort(compareItemsByDate);
  const completedTasks = sorted.filter((item) => item.type === "task" && item.done).length;
  const openItems = sorted.filter((item) => item.type === "event" || !item.done).length;

  upcomingCount.textContent = `${openItems} ${openItems === 1 ? "item" : "items"}`;
  completedCount.textContent = `${completedTasks} ${completedTasks === 1 ? "task" : "tasks"}`;

  if (sorted.length === 0) {
    allItems.innerHTML = `
      <div class="empty-state">
        All created events and tasks will appear here.
      </div>
    `;
    return;
  }

  allItems.innerHTML = sorted
    .map((item) => {
      const prettyDate = parseDateKey(item.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      const badge = item.type === "task" && item.done ? "done" : item.type;
      const completedClass = item.type === "task" && item.done ? "completed" : "";
      const toggleMarkup =
        item.type === "task"
          ? `<button class="complete-toggle ${item.done ? "done" : ""}" type="button" data-toggle-id="${item.id}" aria-label="${item.done ? "Mark task incomplete" : "Mark task complete"}"></button>`
          : `<div></div>`;

      return `
        <article class="all-item-card clickable ${item.type} ${completedClass}" data-open-id="${item.id}">
          ${toggleMarkup}
          <div>
            <div class="all-item-top">
              <div>
                <span class="item-badge">${badge}</span>
                <h4>${escapeHtml(item.title)}</h4>
              </div>
              <span class="item-meta">${prettyDate}${item.time ? ` · ${formatTime(item.time)}` : ""}</span>
            </div>
            <p class="item-note">${item.note ? escapeHtml(item.note) : "No extra details added yet."}</p>
          </div>
        </article>
      `;
    })
    .join("");

  allItems.querySelectorAll("[data-toggle-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleTask(button.dataset.toggleId);
    });
  });

  bindOpenDetails(allItems);
}

function renderStats() {
  const events = state.items.filter((item) => item.type === "event").length;
  const tasks = state.items.filter((item) => item.type === "task").length;
  const openTasks = state.items.filter((item) => item.type === "task" && !item.done).length;

  eventCount.textContent = String(events);
  taskCount.textContent = String(tasks);
  openCount.textContent = String(openTasks);
}

function renderDetailModal() {
  const item = state.items.find((entry) => entry.id === state.activeDetailId);

  if (!item) {
    detailModal.classList.remove("open");
    detailModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    return;
  }

  detailType.textContent = item.type === "task" && item.done ? "Completed task" : item.type;
  detailTitle.textContent = item.title;
  detailDate.textContent = parseDateKey(item.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  detailTime.textContent = item.time ? `Time: ${formatTime(item.time)}` : "Time: Anytime";
  detailNote.textContent = item.note || "No extra note was added for this item.";

  if (item.type === "task") {
    detailToggleTask.classList.remove("hidden");
    detailToggleTask.textContent = item.done ? "Mark incomplete" : "Mark complete";
  } else {
    detailToggleTask.classList.add("hidden");
  }

  detailModal.classList.add("open");
  detailModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function bindOpenDetails(container) {
  container.querySelectorAll("[data-open-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.activeDetailId = card.dataset.openId;
      renderDetailModal();
    });
  });
}

function toggleTask(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item || item.type !== "task") {
    return;
  }

  item.done = !item.done;
  persistItems();
  render();
}

function closeModal() {
  state.activeDetailId = null;
  renderDetailModal();
}

function getItemsForDate(dateKey) {
  return state.items
    .filter((item) => item.date === dateKey)
    .sort(compareItemsByTime);
}

function compareItemsByTime(left, right) {
  if (!left.time && !right.time) {
    return 0;
  }
  if (!left.time) {
    return 1;
  }
  if (!right.time) {
    return -1;
  }
  return left.time.localeCompare(right.time);
}

function compareItemsByDate(left, right) {
  const leftDate = `${left.date}-${left.time || "99:99"}`;
  const rightDate = `${right.date}-${right.time || "99:99"}`;
  return leftDate.localeCompare(rightDate);
}

function buildShareSummary() {
  const selected = getItemsForDate(state.selectedDate);
  const prettyDate = parseDateKey(state.selectedDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (selected.length === 0) {
    return `Month At A Glance: no items shared for ${prettyDate} yet.`;
  }

  const summary = selected
    .slice(0, 4)
    .map((item) => {
      const prefix =
        item.type === "task" ? `${item.done ? "Completed task" : "Task"}` : "Event";
      return `${prefix}: ${item.title}${item.time ? ` at ${formatTime(item.time)}` : ""}`;
    })
    .join(" | ");

  return `Month At A Glance for ${prettyDate}: ${summary}`;
}

function loadItems() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_error) {
    return [];
  }
}

function persistItems() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function seedItems() {
  if (state.items.length > 0) {
    return;
  }

  state.items = [
    {
      id: crypto.randomUUID(),
      type: "event",
      title: "Launch planning",
      note: "Quick team sync for the month timeline.",
      time: "09:00",
      date: formatDateKey(today),
      done: false,
      sharedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "task",
      title: "Finalize design review",
      note: "Share updates with the project group.",
      time: "13:30",
      date: formatDateKey(today),
      done: false,
      sharedAt: new Date().toISOString(),
    },
  ];

  persistItems();
}

function normalizeItems() {
  let changed = false;

  state.items = state.items.map((item) => {
    if (typeof item.done === "boolean") {
      return item;
    }
    changed = true;
    return {
      ...item,
      done: false,
    };
  });

  if (changed) {
    persistItems();
  }
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTime(time) {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
