/*
  script.js — handles all pages
*/
const API_BASE_URL = '/api/';

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

// ---------- Utility: API request ----------
async function request(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
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

// ---------- Dashboard ----------
async function renderDashboard() {
  try {
    const agents = await request(API_BASE_URL + 'agents');
    const total = agents.length;
    const active = agents.filter(a => (a.status || '').toLowerCase() === 'active').length;
    const inactive = total - active;

    document.getElementById('total-agents').textContent = total;
    document.getElementById('active-agents').textContent = active;
    document.getElementById('inactive-agents').textContent = inactive;

    // recent 5
    const recent = agents.slice().sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
    const tbody = document.querySelector('#recent-table tbody');
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
  } catch (err) {
    showAlert('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ---------- Agents ----------
let AGENTS_CACHE = [];

async function loadAgents() {
  try {
    const agents = await request(API_BASE_URL + 'agents');
    AGENTS_CACHE = agents;
    populateFilters(agents);
    renderAgentsTable(agents);
  } catch (err) {
    showAlert('Failed to load agents: ' + err.message, 'error');
  }
}

function populateFilters(agents) {
  const roles = Array.from(new Set(agents.map(a => a.role || '').filter(Boolean))).sort();
  const depts = Array.from(new Set(agents.map(a => a.department || '').filter(Boolean))).sort();
  document.getElementById('filter-role').innerHTML =
    '<option value="">All Roles</option>' + roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  document.getElementById('filter-dept').innerHTML =
    '<option value="">All Departments</option>' + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function renderAgentsTable(agents) {
  const tbody = document.querySelector('#agents-table tbody');
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
}

function applySearchAndFilters() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  const role = document.getElementById('filter-role').value;
  const dept = document.getElementById('filter-dept').value;
  const status = document.getElementById('filter-status').value;

  const filtered = AGENTS_CACHE.filter(a => {
    if (role && (a.role || '') !== role) return false;
    if (dept && (a.department || '') !== dept) return false;
    if (status && (a.status || '').toLowerCase() !== status.toLowerCase()) return false;
    if (q) {
      const hay = `${a.full_name || ''} ${a.email || ''}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });
  renderAgentsTable(filtered);
}

async function agentsTableHandler(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('btn-edit')) {
    sessionStorage.setItem('edit_agent_id', id);
    window.location.href = 'form.html?id=' + encodeURIComponent(id);
  }
  if (e.target.classList.contains('btn-delete')) {
    if (!confirm('Delete this agent?')) return;
    try {
      await request(API_BASE_URL + `agents/${id}`, { method: 'DELETE' });
      showAlert('Agent deleted');
      AGENTS_CACHE = AGENTS_CACHE.filter(a => String(a.id) !== String(id));
      applySearchAndFilters();
    } catch (err) {
      showAlert('Delete failed: ' + err.message, 'error');
    }
  }
}

// ---------- Form ----------
async function setupFormPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || sessionStorage.getItem('edit_agent_id');
  const title = document.getElementById('form-title');
  const form = document.getElementById('agent-form');

  if (id) {
    title.textContent = 'Edit Agent';
    try {
      const agent = await request(API_BASE_URL + `agents/${id}`);
      if (agent) {
        fillForm(agent);
        document.getElementById('agent-id').value = agent.id;
      }
    } catch (err) {
      showAlert('Failed to load agent: ' + err.message, 'error');
    }
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const data = readForm();
    const existingId = document.getElementById('agent-id').value;
    try {
      if (existingId) {
        await request(API_BASE_URL + `agents/${existingId}`, { method: 'PUT', body: JSON.stringify(data) });
        showAlert('Agent updated');
        sessionStorage.removeItem('edit_agent_id');
        window.location.href = 'agents.html';
      } else {
        await request(API_BASE_URL + 'agents', { method: 'POST', body: JSON.stringify(data) });
        showAlert('Agent created');
        window.location.href = 'agents.html';
      }
    } catch (err) {
      showAlert('Save failed: ' + err.message, 'error');
    }
  });
}

function fillForm(a) {
  document.getElementById('full_name').value = a.full_name || '';
  document.getElementById('email').value = a.email || '';
  document.getElementById('phone').value = a.phone || '';
  document.getElementById('address').value = a.address || '';
  document.getElementById('role').value = a.role || '';
  document.getElementById('department').value = a.department || '';
  if ((a.status || '').toLowerCase() === 'inactive') {
    document.getElementById('status-inactive').checked = true;
  } else {
    document.getElementById('status-active').checked = true;
  }
  if (a.date_of_joining) {
    document.getElementById('date_of_joining').value = a.date_of_joining.split('T')[0];
  }
}

function readForm() {
  return {
    full_name: document.getElementById('full_name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    role: document.getElementById('role').value,
    department: document.getElementById('department').value,
    status: document.querySelector('input[name="status"]:checked').value,
    date_of_joining: document.getElementById('date_of_joining').value || null,
  };
}

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Init ----------
function init() {
  const page = document.body.dataset.page;

  // 🔐 auth check first
  requireAuth(page);

  if (page === 'dashboard') renderDashboard();
  if (page === 'agents') {
    loadAgents();
    document.getElementById('search').addEventListener('input', applySearchAndFilters);
    document.getElementById('filter-role').addEventListener('change', applySearchAndFilters);
    document.getElementById('filter-dept').addEventListener('change', applySearchAndFilters);
    document.getElementById('filter-status').addEventListener('change', applySearchAndFilters);
    document.querySelector('#agents-table tbody').addEventListener('click', agentsTableHandler);
  }
  if (page === 'form') setupFormPage();

  // login page
  if (page === 'login') {
    const form = document.getElementById("loginForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(API_BASE_URL + "login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "index.html";
        } else {
          document.getElementById("error").textContent = data.error || "Login failed.";
        }
      } catch (err) {
        document.getElementById("error").textContent = "Server error.";
      }
    });
  }

  // logout page
  if (page === 'logout') {
    logout();
  }

  // sidebar toggle
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const body = document.body;
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      body.classList.toggle('sidebar-open');
    });
    body.addEventListener('click', e => {
      if (body.classList.contains('sidebar-open') &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
        body.classList.remove('sidebar-open');
      }
    });
  }

  // nav highlight
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop();
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // 🎨 auto background switch
  const backgrounds = [
    "linear-gradient(135deg, #f9fbfd, #eef2f9)",
    "linear-gradient(135deg, #fff7ed, #fde68a)",
    "linear-gradient(135deg, #f0fdfa, #99f6e4)"
  ];
  let current = 0;
  setInterval(() => {
    current = (current + 1) % backgrounds.length;
    document.documentElement.style.setProperty("--bg", backgrounds[current]);
  }, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}