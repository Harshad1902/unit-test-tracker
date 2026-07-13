const STORAGE_KEY = "unit_test_tracker_items_v2";
const THEME_KEY = "unit_test_tracker_theme";

const state = {
  items: [],
  activeTab: "all",
  search: "",
  statusFilter: "all",
  priorityFilter: "all",
  draggedId: null,
};

const el = {
  testForm: document.getElementById("testForm"),
  formSection: document.getElementById("formSection"),
  itemId: document.getElementById("itemId"),
  title: document.getElementById("title"),
  module: document.getElementById("module"),
  type: document.getElementById("type"),
  status: document.getElementById("status"),
  priority: document.getElementById("priority"),
  notes: document.getElementById("notes"),
  testList: document.getElementById("testList"),
  emptyState: document.getElementById("emptyState"),
  formTitle: document.getElementById("formTitle"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  saveBtn: document.getElementById("saveBtn"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  priorityFilter: document.getElementById("priorityFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  itemTemplate: document.getElementById("itemTemplate"),
  tabButtons: [...document.querySelectorAll(".tab-btn")],
  totalCount: document.getElementById("totalCount"),
  doneCount: document.getElementById("doneCount"),
  plannedCount: document.getElementById("plannedCount"),
  visibleCount: document.getElementById("visibleCount"),
  toastContainer: document.getElementById("toastContainer"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  progressChart: document.getElementById("progressChart"),
  chartPercent: document.getElementById("chartPercent"),
};

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function normalizeStatus(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}
function normalize(value) {
  return String(value || "").trim();
}
function showToast(message, type = "success", timeout = 2200) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 180);
  }, timeout);
}
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) state.items = parsed.filter(isValidItem).map(sanitizeItem);
  } catch {
    showToast("Could not read saved items from localStorage.", "error");
  }
}
function isValidItem(item) {
  if (!item || typeof item !== "object") return false;
  const required = ["id", "title", "module", "type", "status", "priority"];
  return required.every((k) => Object.hasOwn(item, k));
}
function sanitizeItem(item) {
  return {
    id: normalize(item.id),
    title: normalize(item.title).slice(0, 120),
    module: normalize(item.module).slice(0, 120),
    type: item.type === "planned" ? "planned" : "existing",
    status: ["Not Started", "In Progress", "Done"].includes(item.status) ? item.status : "Not Started",
    priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
    notes: normalize(item.notes).slice(0, 500),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}
function clearForm() {
  el.itemId.value = "";
  el.title.value = "";
  el.module.value = "";
  el.type.value = "existing";
  el.status.value = "Not Started";
  el.priority.value = "Medium";
  el.notes.value = "";
  el.formTitle.textContent = "Add Test Item";
  el.saveBtn.textContent = "Save";
  el.cancelEditBtn.hidden = true;
}
function fillForm(item) {
  el.itemId.value = item.id;
  el.title.value = item.title;
  el.module.value = item.module;
  el.type.value = item.type;
  el.status.value = item.status;
  el.priority.value = item.priority;
  el.notes.value = item.notes || "";
  el.formTitle.textContent = "Edit Test Item";
  el.saveBtn.textContent = "Update";
  el.cancelEditBtn.hidden = false;
}
function getFilteredItems() {
  return state.items.filter((item) => {
    const matchesTab = state.activeTab === "all" || item.type === state.activeTab;
    const hay = `${item.title} ${item.module} ${item.notes}`.toLowerCase();
    const matchesSearch = hay.includes(state.search.toLowerCase());
    const matchesStatus = state.statusFilter === "all" || item.status === state.statusFilter;
    const matchesPriority = state.priorityFilter === "all" || item.priority === state.priorityFilter;
    return matchesTab && matchesSearch && matchesStatus && matchesPriority;
  });
}
function badge(text, cls) {
  const span = document.createElement("span");
  span.className = `badge ${cls}`;
  span.textContent = text;
  return span;
}
function initChartGradient() {
  const svgNS = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(svgNS, "defs");
  const grad = document.createElementNS(svgNS, "linearGradient");
  grad.setAttribute("id", "gradStroke");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("y2", "0%");
  const s1 = document.createElementNS(svgNS, "stop");
  s1.setAttribute("offset", "0%");
  s1.setAttribute("stop-color", "#6366f1");
  const s2 = document.createElementNS(svgNS, "stop");
  s2.setAttribute("offset", "100%");
  s2.setAttribute("stop-color", "#22d3ee");
  grad.append(s1, s2);
  defs.appendChild(grad);
  el.progressChart.prepend(defs);
}
function renderStats(visibleItems) {
  const total = state.items.length;
  const done = state.items.filter((i) => i.status === "Done").length;
  const planned = state.items.filter((i) => i.type === "planned").length;
  el.totalCount.textContent = total;
  el.doneCount.textContent = done;
  el.plannedCount.textContent = planned;
  el.visibleCount.textContent = `${visibleItems.length} visible`;

  const percent = total ? Math.round((done / total) * 100) : 0;
  el.chartPercent.textContent = `${percent}%`;
  const circumference = 2 * Math.PI * 46; // r=46
  const offset = circumference - (percent / 100) * circumference;
  const progressCircle = el.progressChart.querySelector(".progress");
  progressCircle.style.strokeDasharray = `${circumference}`;
  progressCircle.style.strokeDashoffset = `${offset}`;
}
function render() {
  const items = getFilteredItems();
  el.testList.innerHTML = "";
  el.emptyState.style.display = items.length ? "none" : "block";
  renderStats(items);

  items.forEach((item) => {
    const node = el.itemTemplate.content.cloneNode(true);
    const li = node.querySelector(".test-item");
    li.dataset.id = item.id;

    node.querySelector(".item-title").textContent = item.title;
    node.querySelector(".item-meta").textContent = `Module: ${item.module}`;
    node.querySelector(".item-notes").textContent = item.notes || "No notes.";

    const badges = node.querySelector(".badges");
    badges.appendChild(badge(item.type === "existing" ? "Existing" : "Planned", item.type === "existing" ? "badge-type-existing" : "badge-type-planned"));
    badges.appendChild(badge(item.status, `badge-status-${normalizeStatus(item.status)}`));
    badges.appendChild(badge(item.priority, `badge-priority-${item.priority.toLowerCase()}`));

    node.querySelector(".edit-btn").addEventListener("click", () => {
      fillForm(item);
      el.formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      el.title.focus();
    });

    node.querySelector(".delete-btn").addEventListener("click", () => {
      if (!window.confirm(`Delete "${item.title}"?`)) return;
      state.items = state.items.filter((i) => i.id !== item.id);
      saveToStorage();
      render();
      showToast("Item deleted.");
    });

    attachDragEvents(li);
    el.testList.appendChild(node);
  });
}

function attachDragEvents(li) {
  li.addEventListener("dragstart", () => {
    state.draggedId = li.dataset.id;
    li.classList.add("dragging");
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    state.draggedId = null;
    [...el.testList.children].forEach((c) => c.classList.remove("drag-over"));
  });
  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    li.classList.add("drag-over");
  });
  li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    li.classList.remove("drag-over");
    const targetId = li.dataset.id;
    if (!state.draggedId || state.draggedId === targetId) return;
    reorderItems(state.draggedId, targetId);
  });
}

function reorderItems(draggedId, targetId) {
  // Reorder only among currently visible sequence while preserving hidden item order
  const visible = getFilteredItems();
  const visibleIds = visible.map((i) => i.id);

  const from = visibleIds.indexOf(draggedId);
  const to = visibleIds.indexOf(targetId);
  if (from < 0 || to < 0) return;

  visibleIds.splice(to, 0, visibleIds.splice(from, 1)[0]);

  const byId = new Map(state.items.map((i) => [i.id, i]));
  const newVisible = visibleIds.map((id) => byId.get(id)).filter(Boolean);

  // rebuild all items: replace visible ones in the order of appearance
  let idx = 0;
  state.items = state.items.map((item) => {
    if (visibleIds.includes(item.id)) {
      const next = { ...newVisible[idx++], updatedAt: new Date().toISOString() };
      return next;
    }
    return item;
  });

  saveToStorage();
  render();
  showToast("Order updated.");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
  showToast("Theme updated.");
}

function exportJson() {
  const payload = { exportedAt: new Date().toISOString(), version: 2, items: state.items };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unit-test-tracker-v2-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Exported JSON.");
}

async function importJson(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.items)) throw new Error("Expected { items: [] } JSON format.");
  const imported = data.items.filter(isValidItem).map(sanitizeItem);
  if (!imported.length) throw new Error("No valid items in imported file.");
  const merge = window.confirm(`Import ${imported.length} items?\nOK = merge, Cancel = replace all`);
  state.items = merge ? [...state.items, ...imported] : imported;
  saveToStorage();
  render();
  showToast(`Imported ${imported.length} item(s).`);
}

function onSubmit(e) {
  e.preventDefault();
  const draft = sanitizeItem({
    id: el.itemId.value || uid(),
    title: el.title.value,
    module: el.module.value,
    type: el.type.value,
    status: el.status.value,
    priority: el.priority.value,
    notes: el.notes.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!draft.title || !draft.module) {
    showToast("Title and Module are required.", "error");
    return;
  }

  const editingId = el.itemId.value;
  if (editingId) {
    state.items = state.items.map((item) =>
      item.id === editingId
        ? { ...draft, createdAt: item.createdAt, updatedAt: new Date().toISOString() }
        : item
    );
    showToast("Item updated.");
  } else {
    state.items.unshift(draft);
    showToast("Item added.");
  }

  saveToStorage();
  clearForm();
  render();
}

function registerEvents() {
  el.testForm.addEventListener("submit", onSubmit);
  el.cancelEditBtn.addEventListener("click", () => {
    clearForm();
    showToast("Edit canceled.");
  });

  el.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    render();
  });
  el.statusFilter.addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    render();
  });
  el.priorityFilter.addEventListener("change", (e) => {
    state.priorityFilter = e.target.value;
    render();
  });
  el.clearFiltersBtn.addEventListener("click", () => {
    state.search = "";
    state.statusFilter = "all";
    state.priorityFilter = "all";
    el.searchInput.value = "";
    el.statusFilter.value = "all";
    el.priorityFilter.value = "all";
    render();
    showToast("Filters cleared.");
  });

  el.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.dataset.tab;
      render();
    });
  });

  el.exportBtn.addEventListener("click", exportJson);

  el.importFile.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJson(file);
    } catch (err) {
      showToast(`Import failed: ${err.message}`, "error", 3200);
    } finally {
      e.target.value = "";
    }
  });

  el.themeToggleBtn.addEventListener("click", toggleTheme);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const isMod = e.ctrlKey || e.metaKey;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";

    if (key === "/" && !typing) {
      e.preventDefault();
      el.searchInput.focus();
      return;
    }
    if (key === "n" && !typing) {
      e.preventDefault();
      clearForm();
      el.formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => el.title.focus(), 120);
      return;
    }
    if (isMod && key === "s") {
      e.preventDefault();
      el.testForm.requestSubmit();
      return;
    }
    if (key === "escape") {
      clearForm();
    }
  });
}

function init() {
  initTheme();
  initChartGradient();
  loadFromStorage();
  registerEvents();
  render();
}
init();
