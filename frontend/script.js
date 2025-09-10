// =========================
// Configuration
// =========================
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api/"
    : "https://atsu-4.onrender.com/api/";

// =========================
// Utility Functions
// =========================

// Display alert message
function showAlert(message, type = "success", duration = 3000) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.position = "fixed";
  el.style.right = "20px";
  el.style.top = "20px";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "8px";
  el.style.zIndex = 9999;
  el.style.background = type === "error" ? "#fee2e2" : "#ecfeff";
  el.style.color = type === "error" ? "#991b1b" : "#064e3b";
  el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// Properly escape potentially unsafe HTML
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// DOM helper shortcuts
const qs = (selector, ctx = document) => ctx.querySelector(selector);
const qsa = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

// =========================
// API & Authentication
// =========================
async function request(url, opts = {}) {
  try {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    const res = await fetch(url, { ...opts, headers });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = isJson && data?.message ? data.message : data;
      throw new Error(message || `Request failed (${res.status})`);
    }

    return data;
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}

function authHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch {
    return {};
  }
}

function requireAuth(page) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user && page !== "login" && page !== "logout") {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// =========================
// Theme Management
// =========================
function applyTheme(name) {
  document.documentElement.setAttribute("data-theme", name);
  localStorage.setItem("theme", name);
}

function addThemeToggleButton() {
  const container = qs("#theme-toggle-container");
  if (!container) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "themeToggleBtn";
  btn.textContent = localStorage.getItem("theme") === "dark" ? "🌙" : "☀️";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    const current = localStorage.getItem("theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    btn.textContent = next === "dark" ? "🌙" : "☀️";
  });

  container.appendChild(btn);
}

// =========================
// Sidebar Navigation
// =========================
function initSidebar() {
  const sidebar = qs("#sidebar");
  const toggle = qs("#menu-toggle");
  const collapsedKey = "sidebarCollapsed";

  if (!sidebar) {
    console.warn("Sidebar element not found.");
    return;
  }

  const isCollapsed = localStorage.getItem(collapsedKey) === "true";
  sidebar.classList.toggle("collapsed", isCollapsed);
  document.body.classList.toggle("sidebar-collapsed", isCollapsed);

  if (toggle) {
    toggle.addEventListener("click", () => {
      const nowCollapsed = sidebar.classList.toggle("collapsed");
      document.body.classList.toggle("sidebar-collapsed", nowCollapsed);
      localStorage.setItem(collapsedKey, nowCollapsed);
    });
  } else {
    console.warn("Menu toggle button not found.");
  }

  setActiveLink();
}

// Highlight the active navigation link
function setActiveLink() {
  const page = document.body?.dataset?.page || null;
  const links = qsa("#sidebar a");

  links.forEach(link => link.classList.remove("active"));

  if (page) {
    const pageMatch = qs(`#sidebar a[data-page="${page}"]`);
    if (pageMatch) {
      pageMatch.classList.add("active");
      return;
    }
  }

  const currentPath = window.location.pathname.split("/").pop();
  const pathMatch = qs(`#sidebar a[href*="${currentPath}"]`);
  if (pathMatch) pathMatch.classList.add("active");
}

// =========================
// Dashboard
// =========================
async function renderDashboard() {
  try {
    const agents = await request(`${API_BASE_URL}agents`, { headers: authHeaders() });
    const total = agents.length;
    const active = agents.filter(a => (a.status || "").toLowerCase() === "active").length;
    const inactive = total - active;

    qs("#total-agents").textContent = total;
    qs("#active-agents").textContent = active;
    qs("#inactive-agents").textContent = inactive;

    const recent = agents
      .slice()
      .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
      .slice(0, 5);

    const tbody = qs("#recent-table tbody");
    if (tbody) {
      tbody.innerHTML = recent
        .map(a => {
          const statusClass = (a.status || "").toLowerCase() === "active" ? "active" : "inactive";
          return `
            <tr>
              <td>${escapeHtml(a.id)}</td>
              <td>${escapeHtml(a.full_name)}</td>
              <td>${escapeHtml(a.role)}</td>
              <td><span class="status ${statusClass}">${escapeHtml(a.status)}</span></td>
            </tr>
          `;
        })
        .join("");
    }
  } catch (err) {
    showAlert("Failed to load dashboard: " + err.message, "error");
  }
}

// =========================
// Agents Page
// =========================
let AGENTS_CACHE = [];

async function loadAgents() {
  try {
    const agents = await request(`${API_BASE_URL}agents`, { headers: authHeaders() });
    AGENTS_CACHE = agents;
    populateFilters(agents);
    renderAgentsTable(agents);
  } catch (err) {
    showAlert("Failed to load agents: " + err.message, "error");
  }
}

function populateFilters(agents) {
  const roles = [...new Set(agents.map(a => a.role).filter(Boolean))].sort();
  const depts = [...new Set(agents.map(a => a.department).filter(Boolean))].sort();

  qs("#filter-role").innerHTML =
    `<option value="">All Roles</option>` + roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

  qs("#filter-dept").innerHTML =
    `<option value="">All Departments</option>` + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
}

function renderAgentsTable(agents) {
  const tbody = qs("#agents-table tbody");
  if (!tbody) return;

  tbody.innerHTML = agents
    .map(a => {
      const statusClass = (a.status || "").toLowerCase() === "active" ? "active" : "inactive";
      return `
        <tr data-id="${escapeHtml(a.id)}">
          <td>${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.full_name)}</td>
          <td>${escapeHtml(a.email)}</td>
          <td>${escapeHtml(a.phone)}</td>
          <td>${escapeHtml(a.role)}</td>
          <td>${escapeHtml(a.department)}</td>
          <td><span class="status ${statusClass}">${escapeHtml(a.status)}</span></td>
          <td>
            <button class="btn-edit" data-id="${escapeHtml(a.id)}">Edit</button>
            <button class="btn-delete" data-id="${escapeHtml(a.id)}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function applySearchAndFilters() {
  const q = qs("#search").value.toLowerCase();
  const role = qs("#filter-role").value;
  const dept = qs("#filter-dept").value;
  const status = qs("#filter-status").value;

  const filtered = AGENTS_CACHE.filter(a => {
    if (role && a.role !== role) return false;
    if (dept && a.department !== dept) return false;
    if (status && a.status.toLowerCase() !== status.toLowerCase()) return false;
    if (q && !`${a.full_name} ${a.email} ${a.phone} ${a.role} ${a.department}`.toLowerCase().includes(q)) return false;
    return true;
  });

  renderAgentsTable(filtered);
}

async function agentsTableHandler(e) {
  const edit = e.target.closest(".btn-edit");
  const del = e.target.closest(".btn-delete");

  if (edit) {
    const id = edit.dataset.id;
    window.location.href = `form.html?id=${encodeURIComponent(id)}`;
  }

  if (del) {
    const id = del.dataset.id;
    if (!confirm("Delete this agent?")) return;

    try {
      await request(`${API_BASE_URL}agents/${id}`, { method: "DELETE", headers: authHeaders() });
      showAlert("Agent deleted");
      loadAgents();
    } catch (err) {
      showAlert("Failed to delete agent: " + err.message, "error");
    }
  }
}

// =========================
// Form Page
// =========================
function fillForm(data = {}) {
  const setValue = (id, val) => {
    const el = qs(`#${id}`);
    if (el) el.value = val || "";
  };

  setValue("full_name", data.full_name);
  setValue("email", data.email);
  setValue("phone", data.phone);
  setValue("address", data.address);
  setValue("role", data.role);
  setValue("department", data.department);

  if (data.date_of_joining) {
    qs("#date_of_joining").value = data.date_of_joining.split("T")[0];
  }

  const status = (data.status || "active").toLowerCase();
  qs("#status-active").checked = status === "active";
  qs("#status-inactive").checked = status === "inactive";
}

function readForm() {
  return {
    full_name: qs("#full_name").value,
    email: qs("#email").value,
    phone: qs("#phone").value,
    address: qs("#address").value,
    role: qs("#role").value,
    department: qs("#department").value,
    status: qs('input[name="status"]:checked').value,
    date_of_joining: qs("#date_of_joining").value || null
  };
}

async function setupFormPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (id) {
    try {
      const agent = await request(`${API_BASE_URL}agents/${id}`, { headers: authHeaders() });
      fillForm(agent);
    } catch (err) {
      showAlert("Failed to load agent: " + err.message, "error");
    }
  }

  const form = qs("#agentForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const payload = readForm();

    try {
      if (id) {
        await request(`${API_BASE_URL}agents/${id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showAlert("Agent updated");
      } else {
        await request(`${API_BASE_URL}agents`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showAlert("Agent created");
      }
      setTimeout(() => (window.location.href = "agents.html"), 800);
    } catch (err) {
      showAlert("Failed to save agent: " + err.message, "error");
    }
  });
}

// =========================
// Login
// =========================
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    email: form.querySelector("[name='email']").value,
    password: form.querySelector("[name='password']").value
  };

  try {
    const res = await request(`${API_BASE_URL}auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    localStorage.setItem("user", JSON.stringify(res));
    showAlert("Login successful");
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert("Login failed: " + err.message, "error");
  }
}

// =========================
// Initialization
// =========================
function init() {
  const page = document.body?.dataset?.page;

  // Theme
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
  addThemeToggleButton();

  // Sidebar
  initSidebar();

  // Auth check
  requireAuth(page);

  // Page specific logic
  if (page === "dashboard") renderDashboard();
  if (page === "agents") {
    loadAgents();
    qs("#search")?.addEventListener("input", applySearchAndFilters);
    qs("#filter-role")?.addEventListener("change", applySearchAndFilters);
    qs("#filter-dept")?.addEventListener("change", applySearchAndFilters);
    qs("#filter-status")?.addEventListener("change", applySearchAndFilters);
    qs("#agents-table tbody")?.addEventListener("click", agentsTableHandler);
  }
  if (page === "form") setupFormPage();
  if (page === "login") qs("#loginForm")?.addEventListener("submit", handleLogin);
  if (page === "logout") logout();
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();