const API = window.location.origin;

// ── Redirect if already logged in ─────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("pm_token");
  if (token) window.location.href = "/dashboard";
});

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(tab = "login") {
  document.getElementById("authModal").classList.remove("hidden");
  switchTab(tab);
}

function hideModal() {
  document.getElementById("authModal").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("authModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideModal();
  });
});

function switchTab(tab) {
  document.getElementById("loginPane").classList.toggle("hidden", tab !== "login");
  document.getElementById("registerPane").classList.toggle("hidden", tab !== "register");
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
}

// ── Register ──────────────────────────────────────────────────────────────────
async function doRegister() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const errEl = document.getElementById("regErr");
  errEl.classList.add("hidden");

  if (!username || !email || !password)
    return showErr(errEl, "All fields are required.");
  if (password.length < 6)
    return showErr(errEl, "Password must be at least 6 characters.");

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!data.success) return showErr(errEl, data.message);
    localStorage.setItem("pm_token", data.token);
    localStorage.setItem("pm_user", JSON.stringify(data.user));
    window.location.href = "/dashboard";
  } catch {
    showErr(errEl, "Server error. Please try again.");
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginErr");
  errEl.classList.add("hidden");

  if (!email || !password)
    return showErr(errEl, "Email and password required.");

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) return showErr(errEl, data.message);
    localStorage.setItem("pm_token", data.token);
    localStorage.setItem("pm_user", JSON.stringify(data.user));
    window.location.href = "/dashboard";
  } catch {
    showErr(errEl, "Server error. Please try again.");
  }
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}
