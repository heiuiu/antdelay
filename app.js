const STORAGE_KEY = "antdelay_dates_v1";
const STORAGE_DEBOUNCE = 250;

let state = null;
let saveTimeout = null;
let syncTodayButtonEl = null;
let didInitialTodayScroll = false;
let todaySyncScrollRaf = null;
let johnPorkLayerEl = null;
let johnPorkToggleBtn = null;
let johnPorkOnTop = false;

function nowISO() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatLocalDateKey(y, month0, day) {
  return `${y}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayDate() {
  const t = new Date();
  return formatLocalDateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, STORAGE_DEBOUNCE);
}

function withStateChange(mutator) {
  mutator();
  state.meta.lastUpdatedAt = nowISO();
  persistState();
  render();
}

function defaultState() {
  const today = new Date();
  return {
    meta: {
      createdAt: nowISO(),
      lastUpdatedAt: nowISO(),
      calendarYear: today.getFullYear(),
      calendarMonth: today.getMonth(),
    },
    tasks: [
      {
        id: uid(),
        date: todayDate(),
        text: "Write down what matters today",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      },
    ],
  };
}

function init() {
  state = loadState() || defaultState();
  mount();
  render();
  setupKeyboard();
}

function isViewingCurrentMonth() {
  const t = new Date();
  return (
    state.meta.calendarYear === t.getFullYear() &&
    state.meta.calendarMonth === t.getMonth()
  );
}

function isTodayCellInViewport() {
  const el = document.querySelector(".calendar-day-today");
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function updateTodaySyncUi() {
  if (!syncTodayButtonEl || !state) return;
  const needJump =
    !isViewingCurrentMonth() ||
    !document.querySelector(".calendar-day-today") ||
    !isTodayCellInViewport();
  syncTodayButtonEl.classList.toggle("sync-today-btn--visible", needJump);
  syncTodayButtonEl.setAttribute("aria-hidden", needJump ? "false" : "true");
  syncTodayButtonEl.tabIndex = needJump ? 0 : -1;
}

function scheduleTodaySyncUi() {
  if (todaySyncScrollRaf) cancelAnimationFrame(todaySyncScrollRaf);
  todaySyncScrollRaf = requestAnimationFrame(() => {
    todaySyncScrollRaf = null;
    updateTodaySyncUi();
  });
}

function onTodayScrollOrResize() {
  scheduleTodaySyncUi();
}

function updateJohnPorkButtonLabel() {
  if (!johnPorkToggleBtn) return;
  johnPorkToggleBtn.textContent = johnPorkOnTop ? "Xuống nền" : "Hiện John Pork";
  johnPorkToggleBtn.setAttribute("aria-pressed", johnPorkOnTop ? "true" : "false");
}

function handleJohnPorkFadeTransitionEnd(e) {
  if (e.propertyName !== "opacity") return;
  const el = johnPorkLayerEl;
  if (!el || !el.classList.contains("john-pork-mascot--fade-out")) return;
  el.removeEventListener("transitionend", handleJohnPorkFadeTransitionEnd);
  johnPorkOnTop = !johnPorkOnTop;
  el.classList.toggle("john-pork-mascot--foreground", johnPorkOnTop);
  el.classList.toggle("john-pork-mascot--background", !johnPorkOnTop);
  el.classList.remove("john-pork-mascot--fade-out");
  updateJohnPorkButtonLabel();
}

function toggleJohnPorkLayer() {
  const el = johnPorkLayerEl;
  if (!el) return;
  if (el.classList.contains("john-pork-mascot--fade-out")) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    johnPorkOnTop = !johnPorkOnTop;
    el.classList.toggle("john-pork-mascot--foreground", johnPorkOnTop);
    el.classList.toggle("john-pork-mascot--background", !johnPorkOnTop);
    updateJohnPorkButtonLabel();
    return;
  }

  el.addEventListener("transitionend", handleJohnPorkFadeTransitionEnd);
  el.classList.add("john-pork-mascot--fade-out");
}

function goToToday() {
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth();
  const needNav = state.meta.calendarYear !== y || state.meta.calendarMonth !== m;
  if (needNav) {
    withStateChange(() => {
      state.meta.calendarYear = y;
      state.meta.calendarMonth = m;
    });
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector(".calendar-day-today");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(updateTodaySyncUi, 450);
    });
  });
}

function mount() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  const page = document.createElement("div");
  page.className = "page";

  const inner = document.createElement("div");
  inner.className = "page-inner";

  page.appendChild(inner);
  root.appendChild(page);

  if (!johnPorkLayerEl) {
    const img = document.createElement("img");
    img.id = "john-pork-mascot";
    img.className = "john-pork-mascot john-pork-mascot--background";
    img.src = "./John_Pork.webp";
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    document.body.insertBefore(img, root);
    johnPorkLayerEl = img;
  }

  if (!johnPorkToggleBtn) {
    const jpBtn = document.createElement("button");
    jpBtn.type = "button";
    jpBtn.className = "john-pork-toggle-btn";
    jpBtn.textContent = "Hiện John Pork";
    jpBtn.title = "Đưa John Pork lên trên hoặc xuống nền";
    jpBtn.setAttribute("aria-pressed", "false");
    jpBtn.addEventListener("click", toggleJohnPorkLayer);
    document.body.appendChild(jpBtn);
    johnPorkToggleBtn = jpBtn;
    updateJohnPorkButtonLabel();
  }

  if (!syncTodayButtonEl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sync-today-btn";
    btn.textContent = "Hôm nay";
    btn.title = "Về ngày hôm nay trên lịch";
    btn.addEventListener("click", goToToday);
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    document.body.appendChild(btn);
    syncTodayButtonEl = btn;
    window.addEventListener("scroll", onTodayScrollOrResize, { passive: true });
    window.addEventListener("resize", onTodayScrollOrResize, { passive: true });
  }
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function render() {
  const root = document.querySelector(".page-inner");
  if (!root) return;
  clear(root);

  root.appendChild(renderHeader());

  const notebook = document.createElement("div");
  notebook.className = "notebook";
  notebook.appendChild(renderCalendar());

  root.appendChild(notebook);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let syncAfterScroll = false;
      if (!didInitialTodayScroll) {
        didInitialTodayScroll = true;
        const el = document.querySelector(".calendar-day-today");
        if (el && !isTodayCellInViewport()) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(updateTodaySyncUi, 450);
          syncAfterScroll = true;
        }
      }
      if (!syncAfterScroll) updateTodaySyncUi();
    });
  });
}

function renderHeader() {
  const row = document.createElement("div");
  row.className = "header-row";

  const left = document.createElement("div");
  left.className = "title-block";
  const title = document.createElement("div");
  title.className = "app-title";
  title.textContent = "AntDelay Calendar";
  const sub = document.createElement("div");
  sub.className = "app-subtitle";
  sub.textContent = "";
  left.appendChild(title);
  left.appendChild(sub);

  row.appendChild(left);
  return row;
}

function renderTaskRow(task, options) {
  const wrap = options && options.wrap === true;
  const row = document.createElement("div");
  row.className = "task-row";

  const save = (value) => {
    withStateChange(() => {
      if (!value.trim()) {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
      } else {
        const found = state.tasks.find((t) => t.id === task.id);
        if (found) {
          found.text = value;
          found.updatedAt = nowISO();
        }
      }
    });
  };

  if (wrap) {
    const textarea = document.createElement("textarea");
    textarea.className = "task-input task-input-textarea";
    textarea.rows = 1;
    textarea.value = task.text;
    textarea.placeholder = "Task…";
    textarea.dataset.taskId = task.id;
    textarea.addEventListener("input", () => {
      save(textarea.value);
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
    textarea.addEventListener("blur", () => {
      save(textarea.value);
    });
    // initial auto-resize
    setTimeout(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, 0);
    row.appendChild(textarea);
  } else {
    const input = document.createElement("input");
    input.className = "task-input";
    input.value = task.text;
    input.placeholder = "Task…";
    input.dataset.taskId = task.id;
    input.addEventListener("change", () => save(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = input.value.trim();
        withStateChange(() => {
          const found = state.tasks.find((t) => t.id === task.id);
          if (found) {
            found.text = value;
            found.updatedAt = nowISO();
          }
          const idx = state.tasks.findIndex((t) => t.id === task.id);
          const next = {
            id: uid(),
            date: task.date,
            text: "",
            createdAt: nowISO(),
            updatedAt: nowISO(),
          };
          state.tasks.splice(idx + 1, 0, next);
          setTimeout(() => {
            const el = document.querySelector(`.task-input[data-task-id="${next.id}"]`);
            if (el) el.focus();
          }, 0);
        });
      }
    });
    row.appendChild(input);
  }

  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = "×";
  del.title = "Delete task";
  del.addEventListener("click", () => {
    withStateChange(() => {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
    });
  });

  row.appendChild(del);
  return row;
}

function addTaskForDate(date, text) {
  state.tasks.push({
    id: uid(),
    date,
    text,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

function renderCalendar() {
  const year = state.meta.calendarYear;
  const month = state.meta.calendarMonth;
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil(daysInMonth / 7) * 7;

  const container = document.createElement("div");
  container.className = "calendar-wrap";

  const headerRow = document.createElement("div");
  headerRow.className = "calendar-header-row";

  const monthTitle = document.createElement("div");
  monthTitle.className = "calendar-month-title";
  monthTitle.textContent = start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const nav = document.createElement("div");
  nav.className = "calendar-nav";

  const monthSelect = document.createElement("select");
  monthSelect.className = "calendar-select";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  monthNames.forEach((name, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = name;
    if (idx === month) opt.selected = true;
    monthSelect.appendChild(opt);
  });
  monthSelect.addEventListener("change", () => {
    const m = parseInt(monthSelect.value, 10);
    if (Number.isNaN(m)) return;
    withStateChange(() => {
      state.meta.calendarMonth = m;
    });
  });

  const yearSelect = document.createElement("select");
  yearSelect.className = "calendar-select";
  const baseYear = 1970;
  const maxYear = 2100;
  for (let y = baseYear; y <= maxYear; y++) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (y === year) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  yearSelect.addEventListener("change", () => {
    const y = parseInt(yearSelect.value, 10);
    if (Number.isNaN(y)) return;
    withStateChange(() => {
      state.meta.calendarYear = y;
    });
  });

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "←";
  prevBtn.title = "Previous month";
  prevBtn.addEventListener("click", () => {
    withStateChange(() => {
      let m = state.meta.calendarMonth - 1;
      let y = state.meta.calendarYear;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      state.meta.calendarMonth = m;
      state.meta.calendarYear = y;
    });
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "→";
  nextBtn.title = "Next month";
  nextBtn.addEventListener("click", () => {
    withStateChange(() => {
      let m = state.meta.calendarMonth + 1;
      let y = state.meta.calendarYear;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      state.meta.calendarMonth = m;
      state.meta.calendarYear = y;
    });
  });

  nav.appendChild(monthSelect);
  nav.appendChild(yearSelect);
  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  headerRow.appendChild(monthTitle);
  headerRow.appendChild(nav);

  const wrapper = document.createElement("div");
  wrapper.className = "calendar-grid";

  const todayKey = todayDate();

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i + 1;
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (dayNumber <= daysInMonth) {
      const iso = formatLocalDateKey(year, month, dayNumber);
      if (iso === todayKey) cell.classList.add("calendar-day-today");
      const tasks = state.tasks
        .filter((t) => t.date === iso)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const header = document.createElement("div");
      header.className = "calendar-day-header";
      header.textContent = String(dayNumber);

      const list = document.createElement("div");
      list.className = "calendar-tasks";

      tasks.forEach((t) => {
        list.appendChild(renderTaskRow(t, { wrap: true }));
      });

      const quickRow = document.createElement("div");
      quickRow.className = "quick-add-row";
      const input = document.createElement("input");
      input.className = "quick-add-input";
      input.placeholder = "New task…";
      input.dataset.date = iso;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const text = input.value.trim();
          if (!text) return;
          withStateChange(() => {
            addTaskForDate(iso, text);
          });
          input.value = "";
        }
      });
      quickRow.appendChild(input);

      cell.appendChild(header);
      cell.appendChild(list);
      cell.appendChild(quickRow);
    }

    wrapper.appendChild(cell);
  }

  container.appendChild(headerRow);
  container.appendChild(wrapper);
  return container;
}

function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // handled per-input; avoid global interference
      return;
    }
  });
}

window.addEventListener("load", init);

