const API = window.location.origin;
const token = localStorage.getItem("pm_token");
const user = JSON.parse(localStorage.getItem("pm_user") || "{}");

let selectedColor = "#6366f1";

// ── Auth Guard ────────────────────────────────────────────────────────────────
if (!token) window.location.href = "/";

window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navUser").textContent = "👤 " + (user.username || "User");

  // Color swatches
  document.querySelectorAll(".color-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      sw.classList.add("active");
      selectedColor = sw.dataset.color;
    });
  });

  await loadProjects();
});

function logout() {
  localStorage.removeItem("pm_token");
  localStorage.removeItem("pm_user");
  window.location.href = "/";
}

// ── Load Projects ─────────────────────────────────────────────────────────────
async function loadProjects() {
  const grid = document.getElementById("projectsGrid");
  try {
    const res = await fetch(`${API}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    renderProjects(data.projects);
  } catch (err) {
    grid.innerHTML = `<div class="loading-state">⚠️ ${err.message || "Failed to load projects."}</div>`;
  }
}

function renderProjects(projects) {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = "";

  projects.forEach(p => {
    const id = p._id || p.id;
    const memberCount = (p.members || []).length;
    const initials = (p.members || []).slice(0, 3).map(m => {
      const name = m.username || m;
      return `<div class="proj-member-dot">${name[0]?.toUpperCase()}</div>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "proj-card";
    card.style.setProperty("--proj-color", p.color || "#6366f1");
    card.innerHTML = `
      <div class="proj-card-name">${esc(p.name)}</div>
      ${p.description ? `<div class="proj-card-desc">${esc(p.description)}</div>` : ""}
      <div class="proj-card-meta">
        <div class="proj-card-members">${initials}</div>
        <span class="proj-card-tasks">${memberCount} member${memberCount !== 1 ? "s" : ""}</span>
      </div>
    `;
    card.onclick = () => window.location.href = `/project/${id}`;
    grid.appendChild(card);
  });

  // Add "New Project" card
  const newCard = document.createElement("div");
  newCard.className = "new-proj-card";
  newCard.innerHTML = `<span style="font-size:1.5rem">+</span><span style="font-size:0.85rem;font-weight:600">New Project</span>`;
  newCard.onclick = openCreateProject;
  grid.appendChild(newCard);

  if (projects.length === 0) {
    grid.innerHTML = "";
    const empty = document.createElement("div");
    empty.style.cssText = "grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2)";
    empty.innerHTML = `<div style="font-size:2.5rem;margin-bottom:12px">📋</div><p style="font-size:1rem;margin-bottom:20px">No projects yet. Create your first one!</p>`;
    grid.appendChild(empty);
    grid.appendChild(newCard);
  }
}

// ── Create Project ────────────────────────────────────────────────────────────
function openCreateProject() {
  document.getElementById("createModal").classList.remove("hidden");
  document.getElementById("projName").focus();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) e.target.classList.add("hidden");
  });
});

async function createProject() {
  const name = document.getElementById("projName").value.trim();
  const description = document.getElementById("projDesc").value.trim();
  const errEl = document.getElementById("createErr");
  errEl.classList.add("hidden");

  if (!name) return showErr(errEl, "Project name is required.");

  try {
    const res = await fetch(`${API}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description, color: selectedColor }),
    });
    const data = await res.json();
    if (!data.success) return showErr(errEl, data.message);

    document.getElementById("createModal").classList.add("hidden");
    document.getElementById("projName").value = "";
    document.getElementById("projDesc").value = "";

    const id = data.project._id || data.project.id;
    window.location.href = `/project/${id}`;
  } catch {
    showErr(errEl, "Failed to create project.");
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
function showNotif(msg) {
  document.getElementById("notifText").textContent = msg;
  document.getElementById("notifBar").classList.remove("hidden");
  setTimeout(clearNotif, 6000);
}

function clearNotif() {
  document.getElementById("notifBar").classList.add("hidden");
}

function esc(str = "") {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }
