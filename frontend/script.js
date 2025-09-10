/*
script.js — handles all pages
*/

// 🌍 Auto-detect API URL (local vs production)
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api/"
    : "https://atsu-4.onrender.com/api/";

// ---------- Alert helper ----------
function showAlert(message, type = 'success') {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.right = '20px';
  el.style.top = '20px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.zIndex = 9999;
  el.style.background = type === 'error' ? '#fee2e2' : '#ecfeff';
  el.style.color = type === 'error' ? '#991b1b' : '#064e3b';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ---------- API request ----------
async function request(url, opts = {}) {
  try {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Request failed (${res.status}): ${txt}`);
    }
    const contentType = res.headers.get('content-type') || '';
    return contentType.includes('application/json') ? await res.json() : await res.text();
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}

// ---------- Auth ----------
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

// Handle login
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await request(API_BASE_URL + "login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.success) {
      localStorage.setItem("user", JSON.stringify(res.user));
      showAlert("Login successful!");
      window.location.href = "index.html";
    } else {
      showAlert("Invalid credentials", "error");
    }
  } catch (err) {
    showAlert("Login failed: " + (err.message || err), "error");
  }
}

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fillForm(agent) {
  document.getElementById('agent_id').value = agent.id || '';

  const setIf = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setIf('full_name', agent.full_name);
  setIf('email', agent.email);
  setIf('phone', agent.phone);
  setIf('address', agent.address);
  setIf('role', agent.role);
  setIf('department', agent.department);

  document.getElementById('status-active').checked = (agent.status || '').toLowerCase() === 'active';
  document.getElementById('status-inactive').checked = (agent.status || '').toLowerCase() === 'inactive';

  if (agent.date_of_joining) {
    const dojEl = document.getElementById('date_of_joining');
    if (dojEl) dojEl.value = agent.date_of_joining.split('T')[0];
  }
}

function readForm() {
  const statusEl = document.querySelector('input[name="status"]:checked');
  return {
    id: document.getElementById('agent_id').value || null,
    full_name: (document.getElementById('full_name') || {}).value || '',
    email: (document.getElementById('email') || {}).value || '',
    phone: (document.getElementById('phone') || {}).value || '',
    address: (document.getElementById('address') || {}).value || '',
    role: (document.getElementById('role') || {}).value || '',
    department: (document.getElementById('department') || {}).value || '',
    status: statusEl ? statusEl.value : 'active',
    date_of_joining: (document.getElementById('date_of_joining') || {}).value || null,
  };
}

// ---------- Save Agent (Add or Update) ----------
async function saveAgent(agent) {
  try {
    if (agent.id) {
      // Update existing agent
      await request(API_BASE_URL + 'agents/' + agent.id, {
        method: "PUT",
        body: JSON.stringify(agent),
      });
      showAlert("Agent updated successfully!");
    } else {
      // Add new agent
      await request(API_BASE_URL + 'agents', {
        method: "POST",
        body: JSON.stringify(agent),
      });
      showAlert("Agent added successfully!");
    }

    window.location.href = "agents.html";
  } catch (err) {
    showAlert("Failed to save agent: " + (err.message || err), "error");
  }
}

// ---------- Delete Agent ----------
async function deleteAgent(id) {
  if (!confirm("Are you sure you want to delete this agent?")) return;

  try {
    await request(API_BASE_URL + 'agents/' + id, {
      method: "DELETE",
    });
    showAlert("Agent deleted successfully!");
    loadAgents();
  } catch (err) {
    showAlert("Failed to delete agent: " + (err.message || err), "error");
  }
}

// ---------- Setup Form Page ----------
function setupFormPage() {
  const form = document.getElementById('agentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const agentData = readForm();

    if (!agentData.full_name || !agentData.email) {
      showAlert("Full Name and Email are required.", "error");
      return;
    }

    await saveAgent(agentData);
  });

  // If editing, pre-fill the form
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('id');

  if (agentId) {
    fetchAgentForEdit(agentId);
  }
}

async function fetchAgentForEdit(id) {
  try {
    const agent = await request(API_BASE_URL + 'agents/' + id);
    fillForm(agent);
  } catch (err) {
    showAlert("Failed to load agent: " + (err.message || err), "error");
  }
}

// ---------- Dashboard ----------
async function renderDashboard() {
  try {
    const agents = await request(API_BASE_URL + 'agents');
    const total = Array.isArray(agents) ? agents.length : 0;
    const active = agents.filter(a => (a.status || '').toLowerCase() === 'active').length;
    const inactive = total - active;

    document.getElementById('total-agents').textContent = total;
    document.getElementById('active-agents').textContent = active;
    document.getElementById('inactive-agents').textContent = inactive;

    const recent = [...agents].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)).slice(0, 5);

    const tbody = document.querySelector('#recent-table tbody');
    if (tbody) {
      tbody.innerHTML = '';
      for (const a of recent) {
        const tr = document.createElement('tr');
        const statusClass = (a.status || '').toLowerCase() === 'active' ? 'active' : 'inactive';
        tr.innerHTML = `
          <td>${a.id || ''}</td>
          <td>${escapeHtml(a.full_name || '')}</td>
          <td>${escapeHtml(a.role || '')}</td>
          <td><span class="status ${statusClass}">${escapeHtml(a.status || '')}</span></td>
        `;
        tbody.appendChild(tr);
      }
    }
  } catch (err) {
    showAlert('Failed to load dashboard: ' + (err.message || err), 'error');
  }
}

// ---------- Agents List ----------
let AGENTS_CACHE = [];

async function loadAgents() {
  try {
    const agents = await request(API_BASE_URL + 'agents');
    AGENTS_CACHE = Array.isArray(agents) ? agents : [];
    populateFilters(AGENTS_CACHE);
    renderAgentsTable(AGENTS_CACHE);
  } catch (err) {
    showAlert('Failed to load agents: ' + (err.message || err), 'error');
  }
}

function populateFilters(agents) {
  const roles = Array.from(new Set(agents.map(a => a.role || '').filter(Boolean))).sort();
  const depts = Array.from(new Set(agents.map(a => a.department || '').filter(Boolean))).sort();

  const roleEl = document.getElementById('filter-role');
  const deptEl = document.getElementById('filter-dept');

  if (roleEl) {
    roleEl.innerHTML =
      `<option value="">All Roles</option>` +
      roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  }
  if (deptEl) {
    deptEl.innerHTML =
      `<option value="">All Departments</option>` +
      depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }
}

function renderAgentsTable(agents) {
  const tbody = document.querySelector('#agents-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  for (const a of agents) {
    const tr = document.createElement('tr');
    tr.dataset.id = a.id;
    const statusClass = (a.status || '').toLowerCase() === 'active' ? 'active' : 'inactive';
    tr.innerHTML = `
      <td>${a.id || ''}</td>
      <td>${escapeHtml(a.full_name || '')}</td>
      <td>${escapeHtml(a.email || '')}</td>
      <td>${escapeHtml(a.phone || '')}</td>
      <td>${escapeHtml(a.role || '')}</td>
      <td>${escapeHtml(a.department || '')}</td>
      <td><span class="status ${statusClass}">${escapeHtml(a.status || '')}</span></td>
      <td>
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Attach event listeners
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      window.location.href = `form.html?id=${id}`;
    });
  });

  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      deleteAgent(id);
    });
  });
}

// ---------- Sidebar Toggle ----------
function setupSidebar() {
  const sidebarToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!sidebarToggle || !sidebar) return;

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
  });

  document.body.addEventListener('click', (e) => {
    if (document.body.classList.contains('sidebar-open') && e.target === document.body) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }
  });
}

// ---------- Init ----------
function init() {
  const page = document.body ? document.body.dataset.page : undefined;

  requireAuth(page);
  setupSidebar();

  if (page === 'dashboard') renderDashboard();
  if (page === 'agents') loadAgents();
  if (page === 'form') setupFormPage();

  if (page === 'login') {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
  }

  if (page === 'logout') logout();
}

document.addEventListener('DOMContentLoaded', init);