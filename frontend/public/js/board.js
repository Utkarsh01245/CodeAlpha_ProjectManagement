const API = window.location.origin;
const token = localStorage.getItem("pm_token");
const user  = JSON.parse(localStorage.getItem("pm_user") || "{}");
const projectId = window.location.pathname.split("/project/")[1];

if (!token) window.location.href = "/";
if (!projectId) window.location.href = "/dashboard";

// ── State ─────────────────────────────────────────────────────────────────────
let project = null;
let tasks   = [];
let editingTaskId = null;
let localChecklist = [];
let socket = null;
let draggedTaskId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  await loadProject();
  await loadTasks();
  initSocket();
});

function logout() {
  localStorage.removeItem("pm_token");
  localStorage.removeItem("pm_user");
  window.location.href = "/";
}

// ── Load Project ──────────────────────────────────────────────────────────────
async function loadProject() {
  const res  = await apiFetch(`/api/projects/${projectId}`);
  if (!res.success) return (window.location.href = "/dashboard");
  project = res.project;

  document.getElementById("navProjectName").textContent = project.name;
  document.getElementById("boardTitle").textContent = project.name;
  document.title = `${project.name} — Taskify`;

  // Member avatars
  const avEl = document.getElementById("memberAvatars");
  avEl.innerHTML = (project.members || []).map(m => {
    const name = m.username || m;
    return `<div class="member-av" title="${name}">${name[0]?.toUpperCase()}</div>`;
  }).join("");
}

// ── Load Tasks ────────────────────────────────────────────────────────────────
async function loadTasks() {
  const res = await apiFetch(`/api/tasks/project/${projectId}`);
  tasks = res.tasks || [];
  renderBoard();
}

// ── Render Board ──────────────────────────────────────────────────────────────
function renderBoard() {
  const board = document.getElementById("board");
  const columns = project?.columns || ["To Do", "In Progress", "Review", "Done"];
  board.innerHTML = "";

  columns.forEach(col => {
    const colTasks = tasks.filter(t => t.column === col).sort((a, b) => (a.order || 0) - (b.order || 0));
    const colEl = document.createElement("div");
    colEl.className = "column";
    colEl.dataset.col = col;

    colEl.innerHTML = `
      <div class="column-header">
        <div class="column-title">
          ${colEmoji(col)} ${esc(col)}
          <span class="column-count">${colTasks.length}</span>
        </div>
        <button class="column-add-btn" onclick="openAddTask('${esc(col)}')" title="Add task">+</button>
      </div>
      <div class="column-body" id="col-${slugify(col)}"
        ondragover="onDragOver(event,'${esc(col)}')"
        ondrop="onDrop(event,'${esc(col)}')"
        ondragleave="onDragLeave(event)"
      >
        ${colTasks.map(t => renderTaskCard(t)).join("")}
      </div>
    `;
    board.appendChild(colEl);
  });

  const total = tasks.length;
  document.getElementById("boardTaskCount").textContent = `${total} task${total !== 1 ? "s" : ""}`;
}

function renderTaskCard(t) {
  const tid = t._id || t.id;
  const prio = t.priority || "medium";
  const assignees = (t.assignees || []).slice(0, 3).map(a => {
    const n = a.username || a;
    return `<div class="task-av" title="${n}">${n[0]?.toUpperCase()}</div>`;
  }).join("");

  const labels = (t.labels || []).filter(Boolean).map(l =>
    `<span class="task-label">${esc(l)}</span>`
  ).join("");

  // Due date
  let dueHtml = "";
  if (t.dueDate) {
    const due = new Date(t.dueDate);
    const overdue = due < new Date() && t.column !== "Done";
    dueHtml = `<span class="task-due ${overdue ? "overdue" : ""}">${overdue ? "⚠️ " : "📅 "}${due.toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}</span>`;
  }

  // Checklist progress
  let checklistHtml = "";
  if (t.checklist?.length) {
    const done = t.checklist.filter(c => c.done).length;
    const pct  = Math.round(done / t.checklist.length * 100);
    checklistHtml = `
      <div class="task-checklist-bar">
        <div class="task-cl-progress"><div class="task-cl-fill" style="width:${pct}%"></div></div>
        <span class="task-cl-text">${done}/${t.checklist.length}</span>
      </div>`;
  }

  return `
    <div class="task-card" id="tc-${tid}"
      draggable="true"
      ondragstart="onDragStart(event,'${tid}')"
      ondragend="onDragEnd(event)"
      onclick="openEditTask('${tid}')"
    >
      <div class="task-card-top">
        <div class="task-card-title">${esc(t.title)}</div>
        <div class="task-prio ${prio}"></div>
      </div>
      ${t.description ? `<div class="task-card-desc">${esc(t.description)}</div>` : ""}
      ${labels ? `<div class="task-card-labels">${labels}</div>` : ""}
      ${checklistHtml}
      <div class="task-card-footer">
        <div class="task-assignees">${assignees}</div>
        ${dueHtml}
      </div>
    </div>`;
}

// ── Drag and Drop ─────────────────────────────────────────────────────────────
function onDragStart(e, tid) {
  draggedTaskId = tid;
  setTimeout(() => document.getElementById(`tc-${tid}`)?.classList.add("dragging"), 0);
}
function onDragEnd(e) {
  document.querySelectorAll(".task-card").forEach(c => c.classList.remove("dragging"));
  document.querySelectorAll(".column-body").forEach(c => c.classList.remove("drag-over"));
}
function onDragOver(e, col) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}
function onDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}
async function onDrop(e, col) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  if (!draggedTaskId) return;

  const task = tasks.find(t => (t._id || t.id) === draggedTaskId);
  if (!task || task.column === col) return;

  task.column = col;
  renderBoard();

  await apiFetch(`/api/tasks/${draggedTaskId}/move`, "PATCH", { column: col, order: Date.now() });
  draggedTaskId = null;
}

// ── Task Modal: Open for ADD ──────────────────────────────────────────────────
function openAddTask(col) {
  editingTaskId = null;
  localChecklist = [];

  document.getElementById("taskModalTitle").textContent = "New Task";
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDesc").value = "";
  document.getElementById("taskDueDate").value = "";
  document.getElementById("taskLabels").value = "";
  document.getElementById("taskErr").classList.add("hidden");
  document.getElementById("saveTaskBtn").textContent = "Create Task";
  document.getElementById("deleteTaskBtn").classList.add("hidden");
  document.getElementById("commentsSection").classList.add("hidden");
  document.getElementById("checklistItems").innerHTML = "";

  populateColumns(col || project?.columns?.[0]);
  populateAssignees([]);

  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("taskTitle").focus();
}

// ── Task Modal: Open for EDIT ─────────────────────────────────────────────────
async function openEditTask(tid) {
  const task = tasks.find(t => (t._id || t.id) === tid);
  if (!task) return;
  editingTaskId = tid;
  localChecklist = (task.checklist || []).map(c => ({ ...c }));

  document.getElementById("taskModalTitle").textContent = "Edit Task";
  document.getElementById("taskTitle").value = task.title || "";
  document.getElementById("taskDesc").value  = task.description || "";
  document.getElementById("taskDueDate").value = task.dueDate ? task.dueDate.slice(0, 10) : "";
  document.getElementById("taskLabels").value = (task.labels || []).join(", ");
  document.getElementById("taskErr").classList.add("hidden");
  document.getElementById("saveTaskBtn").textContent = "Save Changes";
  document.getElementById("deleteTaskBtn").classList.remove("hidden");
  document.getElementById("commentsSection").classList.remove("hidden");

  document.getElementById("taskPriority").value = task.priority || "medium";
  populateColumns(task.column);
  populateAssignees(task.assignees || []);
  renderChecklist();
  await loadComments(tid);

  document.getElementById("taskModal").classList.remove("hidden");
}

function closeTaskModal() {
  document.getElementById("taskModal").classList.add("hidden");
  editingTaskId = null;
}

// ── Columns select ────────────────────────────────────────────────────────────
function populateColumns(selected) {
  const sel = document.getElementById("taskColumn");
  sel.innerHTML = (project?.columns || []).map(c =>
    `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(c)}</option>`
  ).join("");
}

// ── Assignees checkboxes ──────────────────────────────────────────────────────
function populateAssignees(currentAssignees) {
  const currentIds = currentAssignees.map(a => a._id || a.id || a);
  const members = project?.members || [];
  const el = document.getElementById("assigneesList");

  el.innerHTML = members.map(m => {
    const mid  = m._id || m.id || m;
    const name = m.username || m;
    const checked = currentIds.includes(mid);
    return `
      <label class="assignee-toggle">
        <input type="checkbox" value="${mid}" ${checked ? "checked" : ""} />
        <div class="user-avatar" style="width:24px;height:24px;font-size:0.65rem">${name[0]?.toUpperCase()}</div>
        <span>${esc(name)}</span>
      </label>`;
  }).join("") || `<div style="font-size:0.82rem;color:var(--text2)">No members to assign</div>`;
}

// ── Checklist ─────────────────────────────────────────────────────────────────
function addChecklistItem() {
  const input = document.getElementById("checklistInput");
  const text = input.value.trim();
  if (!text) return;
  localChecklist.push({ text, done: false });
  input.value = "";
  renderChecklist();
}

function renderChecklist() {
  const el = document.getElementById("checklistItems");
  el.innerHTML = localChecklist.map((item, i) => `
    <div class="checklist-item">
      <input type="checkbox" ${item.done ? "checked" : ""} onchange="toggleCLItem(${i},this.checked)" />
      <span class="${item.done ? "done" : ""}">${esc(item.text)}</span>
      <button onclick="removeCLItem(${i})">✕</button>
    </div>
  `).join("");
}

function toggleCLItem(i, done) {
  localChecklist[i].done = done;
  renderChecklist();
}

function removeCLItem(i) {
  localChecklist.splice(i, 1);
  renderChecklist();
}

// ── Save Task ─────────────────────────────────────────────────────────────────
async function saveTask() {
  const title    = document.getElementById("taskTitle").value.trim();
  const desc     = document.getElementById("taskDesc").value.trim();
  const column   = document.getElementById("taskColumn").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate  = document.getElementById("taskDueDate").value || null;
  const labelsRaw = document.getElementById("taskLabels").value;
  const labels   = labelsRaw.split(",").map(l => l.trim()).filter(Boolean);
  const assignees = [...document.querySelectorAll("#assigneesList input:checked")].map(c => c.value);
  const errEl    = document.getElementById("taskErr");
  errEl.classList.add("hidden");

  if (!title) return showFormErr(errEl, "Task title is required.");

  const payload = { title, description: desc, column, priority, dueDate, labels, assignees, checklist: localChecklist, project: projectId };

  if (editingTaskId) {
    const res = await apiFetch(`/api/tasks/${editingTaskId}`, "PUT", payload);
    if (!res.success) return showFormErr(errEl, res.message);
    const idx = tasks.findIndex(t => (t._id || t.id) === editingTaskId);
    if (idx !== -1) tasks[idx] = res.task;
  } else {
    const res = await apiFetch("/api/tasks", "POST", payload);
    if (!res.success) return showFormErr(errEl, res.message);
    tasks.push(res.task);
  }

  closeTaskModal();
  renderBoard();
}

// ── Delete Task ───────────────────────────────────────────────────────────────
async function deleteTask() {
  if (!editingTaskId || !confirm("Delete this task?")) return;
  await apiFetch(`/api/tasks/${editingTaskId}`, "DELETE");
  tasks = tasks.filter(t => (t._id || t.id) !== editingTaskId);
  closeTaskModal();
  renderBoard();
}

// ── Comments ──────────────────────────────────────────────────────────────────
async function loadComments(taskId) {
  const res = await apiFetch(`/api/comments/task/${taskId}`);
  const list = document.getElementById("commentsList");
  list.innerHTML = "";
  (res.comments || []).forEach(c => appendComment(c));
}

function appendComment(c) {
  const list = document.getElementById("commentsList");
  const cid  = c._id || c.id;
  const authorName = c.author?.username || c.authorName || "User";
  const div = document.createElement("div");
  div.className = "comment-item";
  div.id = `comment-${cid}`;
  div.innerHTML = `
    <div class="comment-header">
      <span class="comment-name">${esc(authorName)}</span>
      <span class="comment-time">${timeAgo(c.createdAt)}</span>
      ${(c.author?._id || c.author) === user.id || c.author === user.id
        ? `<button class="comment-del" onclick="deleteComment('${cid}')">✕</button>` : ""}
    </div>
    <div class="comment-body">${esc(c.content)}</div>
  `;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

async function postComment() {
  const input = document.getElementById("commentInput");
  const content = input.value.trim();
  if (!content || !editingTaskId) return;
  input.value = "";

  const res = await apiFetch("/api/comments", "POST", { task: editingTaskId, content });
  if (res.success) appendComment(res.comment);
}

async function deleteComment(cid) {
  await apiFetch(`/api/comments/${cid}`, "DELETE");
  document.getElementById(`comment-${cid}`)?.remove();
}

// ── Members Modal ─────────────────────────────────────────────────────────────
function openMembers() {
  const list = document.getElementById("membersList");
  const members = project?.members || [];
  list.innerHTML = members.map(m => {
    const mid  = m._id || m.id || m;
    const name = m.username || m;
    const isOwner = (project.owner?._id || project.owner) === mid;
    return `
      <div class="member-item">
        <div class="user-avatar">${name[0]?.toUpperCase()}</div>
        <div>
          <div class="user-name">${esc(name)}</div>
          <div class="user-email">${isOwner ? "👑 Owner" : "Member"}</div>
        </div>
        ${!isOwner ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="removeMember('${mid}')">Remove</button>` : ""}
      </div>`;
  }).join("") || `<div style="color:var(--text2);font-size:0.85rem">No members yet</div>`;

  document.getElementById("membersModal").classList.remove("hidden");
}

let searchTimeout = null;
async function searchUsers() {
  const q = document.getElementById("inviteInput").value.trim();
  const results = document.getElementById("userSearchResults");
  if (!q) { results.innerHTML = ""; return; }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const res = await apiFetch(`/api/auth/search?q=${encodeURIComponent(q)}`);
    results.innerHTML = (res.users || []).map(u => {
      const uid = u._id || u.id;
      return `
        <div class="user-result">
          <div class="user-avatar">${u.username[0]?.toUpperCase()}</div>
          <div><div class="user-name">${esc(u.username)}</div><div class="user-email">${esc(u.email)}</div></div>
          <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="addMember('${uid}')">+ Invite</button>
        </div>`;
    }).join("") || `<div style="color:var(--text2);font-size:0.82rem;padding:8px 0">No users found</div>`;
  }, 300);
}

async function addMember(uid) {
  const res = await apiFetch(`/api/projects/${projectId}/members`, "POST", { userId: uid });
  if (res.success) {
    project = res.project;
    showToast("✅ Member added!");
    openMembers();
  }
}

async function removeMember(uid) {
  if (!confirm("Remove this member?")) return;
  const res = await apiFetch(`/api/projects/${projectId}/members/${uid}`, "DELETE");
  if (res.success) { project = res.project; openMembers(); }
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function openSettings() {
  document.getElementById("settingsName").value = project?.name || "";
  document.getElementById("settingsDesc").value = project?.description || "";
  document.getElementById("settingsModal").classList.remove("hidden");
}

async function saveSettings() {
  const name = document.getElementById("settingsName").value.trim();
  const description = document.getElementById("settingsDesc").value.trim();
  if (!name) return;

  const res = await apiFetch(`/api/projects/${projectId}`, "PUT", { name, description });
  if (res.success) {
    project = res.project;
    document.getElementById("navProjectName").textContent = project.name;
    document.getElementById("boardTitle").textContent = project.name;
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("✅ Project updated!");
  }
}

async function deleteProject() {
  if (!confirm("Delete this project and all its tasks permanently?")) return;
  await apiFetch(`/api/projects/${projectId}`, "DELETE");
  window.location.href = "/dashboard";
}

// ── Socket.io Real-Time ───────────────────────────────────────────────────────
function initSocket() {
  socket = io();
  socket.emit("join-project", projectId);

  socket.on("task:created", (task) => {
    if (!tasks.find(t => (t._id || t.id) === (task._id || task.id))) {
      tasks.push(task);
      renderBoard();
      showToast(`📋 New task: ${task.title}`);
    }
  });

  socket.on("task:updated", (updated) => {
    const idx = tasks.findIndex(t => (t._id || t.id) === (updated._id || updated.id));
    if (idx !== -1) { tasks[idx] = updated; renderBoard(); }
  });

  socket.on("task:moved", ({ taskId, column }) => {
    const task = tasks.find(t => (t._id || t.id) === taskId);
    if (task) { task.column = column; renderBoard(); }
  });

  socket.on("task:deleted", (taskId) => {
    tasks = tasks.filter(t => (t._id || t.id) !== taskId);
    renderBoard();
  });

  socket.on("comment:added", ({ taskId, comment }) => {
    if (editingTaskId === taskId) appendComment(comment);
  });

  socket.on("comment:deleted", ({ taskId, commentId }) => {
    if (editingTaskId === taskId) document.getElementById(`comment-${commentId}`)?.remove();
  });

  socket.on("project:updated", (updated) => {
    project = updated;
    document.getElementById("navProjectName").textContent = project.name;
    document.getElementById("boardTitle").textContent = project.name;
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastT;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add("hidden"), 3200);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(url, method = "GET", body = null) {
  try {
    const opts = { method, headers: { Authorization: `Bearer ${token}` } };
    if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    const res = await fetch(API + url, opts);
    return await res.json();
  } catch { return { success: false, message: "Network error." }; }
}

function esc(str = "") {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function slugify(str) { return str.toLowerCase().replace(/\s+/g, "-"); }

function colEmoji(col) {
  const map = { "To Do": "📋", "In Progress": "🔄", "Review": "👀", "Done": "✅", "Backlog": "📦" };
  return map[col] || "📌";
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function showFormErr(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }

// Close modals on backdrop click
document.addEventListener("DOMContentLoaded", () => {
  ["taskModal","membersModal","settingsModal"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target === e.currentTarget) e.target.classList.add("hidden");
    });
  });
});
