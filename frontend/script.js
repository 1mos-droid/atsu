const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000/api/" : "https://atsu-4.onrender.com/api/";

function showAlert(message, type = 'success', duration = 3000) {
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
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

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
    console.error('API error:', err);
    throw err;
  }
}

function authHeaders() {
  const raw = localStorage.getItem('user');
  if (!raw) return {};
  try {
    const user = JSON.parse(raw);
    if (user && user.token) return { Authorization: `Bearer ${user.token}` };
  } catch (e) {}
  return {};
}

function requireAuth(page) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user && page !== 'login' && page !== 'logout') {
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '\'');
}

function qs(selector, ctx = document) {
  return ctx.querySelector(selector);
}

function qsa(selector, ctx = document) {
  return Array.from(ctx.querySelectorAll(selector));
}

function fillForm(a = {}) {
  const setIf = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  setIf('full_name', a.full_name);
  setIf('email', a.email);
  setIf('phone', a.phone);
  setIf('address', a.address);
  setIf('role', a.role);
  setIf('department', a.department);

  const statusInactive = document.getElementById('status-inactive');
  const statusActive = document.getElementById('status-active');
  if ((a.status || '').toLowerCase() === 'inactive') {
    if (statusInactive) statusInactive.checked = true;
  } else {
    if (statusActive) statusActive.checked = true;
  }

  if (a.date_of_joining) {
    const dojEl = document.getElementById('date_of_joining');
    if (dojEl) dojEl.value = String(a.date_of_joining).split('T')[0];
  }
}

function readForm() {
  const statusEl = document.querySelector('input[name="status"]:checked');
  return {
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

async function renderDashboard() {
  try {
    const agents = await request(API_BASE_URL + 'agents', { headers: authHeaders() });
    const total = Array.isArray(agents) ? agents.length : 0;
    const active = (agents || []).filter(a => (a.status || '').toLowerCase() === 'active').length;
    const inactive = total - active;

    const totalEl = document.getElementById('total-agents');
    const activeEl = document.getElementById('active-agents');
    const inactiveEl = document.getElementById('inactive-agents');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (inactiveEl) inactiveEl.textContent = inactive;

    const recent = (agents || []).slice().sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)).slice(0, 5);
    const tbody = document.querySelector('#recent-table tbody');
    if (tbody) {
      tbody.innerHTML = '';
      for (const a of recent) {
        const tr = document.createElement('tr');
        const statusClass = (a.status || '').toLowerCase() === 'active' ? 'active' : 'inactive';
        tr.innerHTML = `
          <td>${escapeHtml(a.id ?? '')}</td>
          <td>${escapeHtml(a.full_name ?? '')}</td>
          <td>${escapeHtml(a.role ?? '')}</td>
          <td><span class="status ${statusClass}">${escapeHtml(a.status ?? '')}</span></td>
        `;
        tbody.appendChild(tr);
      }
    }
  } catch (err) {
    showAlert('Failed to load dashboard: ' + (err.message || err), 'error');
  }
}

let AGENTS_CACHE = [];

async function loadAgents() {
  try {
    const agents = await request(API_BASE_URL + 'agents', { headers: authHeaders() });
    AGENTS_CACHE = Array.isArray(agents) ? agents : [];
    populateFilters(AGENTS_CACHE);
    renderAgentsTable(AGENTS_CACHE);
  } catch (err) {
    showAlert('Failed to load agents: ' + (err.message || err), 'error');
  }
}

function populateFilters(agents) {
  const roles = Array.from(new Set((agents || []).map(a => a.role || '').filter(Boolean))).sort();
  const depts = Array.from(new Set((agents || []).map(a => a.department || '').filter(Boolean))).sort();

  const roleEl = document.getElementById('filter-role');
  const deptEl = document.getElementById('filter-dept');

  if (roleEl) {
    roleEl.innerHTML = '<option value="">All Roles</option>' +
      roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  }
  if (deptEl) {
    deptEl.innerHTML = '<option value="">All Departments</option>' +
      depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }
}

function renderAgentsTable(agents) {
  const tbody = document.querySelector('#agents-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (const a of (agents || [])) {
    const tr = document.createElement('tr');
    tr.dataset.id = a.id;
    const statusClass = (a.status || '').toLowerCase() === 'active' ? 'active' : 'inactive';
    tr.innerHTML = `
      <td>${escapeHtml(a.id ?? '')}</td>
      <td>${escapeHtml(a.full_name ?? '')}</td>
      <td>${escapeHtml(a.email ?? '')}</td>
      <td>${escapeHtml(a.phone ?? '')}</td>
      <td>${escapeHtml(a.role ?? '')}</td>
      <td>${escapeHtml(a.department ?? '')}</td>
      <td><span class="status ${statusClass}">${escapeHtml(a.status ?? '')}</span></td>
      <td>
        <button class="btn-edit" data-id="${escapeHtml(a.id ?? '')}">Edit</button>
        <button class="btn-delete" data-id="${escapeHtml(a.id ?? '')}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function applySearchAndFilters() {
  const q = (document.getElementById('search') || {}).value || '';
  const role = (document.getElementById('filter-role') || {}).value || '';
  const dept = (document.getElementById('filter-dept') || {}).value || '';
  const status = (document.getElementById('filter-status') || {}).value || '';

  const filtered = AGENTS_CACHE.filter(a => {
    if (role && (a.role || '') !== role) return false;
    if (dept && (a.department || '') !== dept) return false;
    if (status) {
      if (status === 'active' && (a.status || '').toLowerCase() !== 'active') return false;
      if (status === 'inactive' && (a.status || '').toLowerCase() !== 'inactive') return false;
    }
    if (q) {
      const hay = `${a.full_name || ''} ${a.email || ''} ${a.phone || ''} ${a.role || ''} ${a.department || ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  renderAgentsTable(filtered);
}

async function agentsTableHandler(e) {
  const edit = e.target.closest('.btn-edit');
  const del = e.target.closest('.btn-delete');
  if (edit) {
    const id = edit.dataset.id;
    if (id) window.location.href = `form.html?id=${encodeURIComponent(id)}`;
    return;
  }
  if (del) {
    const id = del.dataset.id;
    if (!id) return;
    if (!confirm('Delete this agent?')) return;
    try {
      await request(`${API_BASE_URL}agents/${id}`, { method: 'DELETE', headers: authHeaders() });
      showAlert('Agent deleted');
      await loadAgents();
    } catch (err) {
      showAlert('Failed to delete agent: ' + (err.message || err), 'error');
    }
  }
}

async function setupFormPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const form = document.getElementById('agentForm');
  if (id) {
    try {
      const agent = await request(`${API_BASE_URL}agents/${id}`, { headers: authHeaders() });
      fillForm(agent || {});
    } catch (err) {
      showAlert('Failed to load agent: ' + (err.message || err), 'error');
    }
  }
  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const payload = readForm();
      try {
        if (id) {
          await request(`${API_BASE_URL}agents/${id}`, {
            method: 'PUT',
            headers: Object.assign(authHeaders(), { 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
          });
          showAlert('Agent updated');
        } else {
          await request(API_BASE_URL + 'agents', {
            method: 'POST',
            headers: Object.assign(authHeaders(), { 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
          });
          showAlert('Agent created');
        }
        setTimeout(() => window.location.href = 'agents.html', 800);
      } catch (err) {
        showAlert('Failed to save agent: ' + (err.message || err), 'error');
      }
    });
  }
}

async function handleLogin(ev) {
  ev.preventDefault();
  const form = ev.target;
  const data = {
    email: (form.querySelector('[name="email"]') || {}).value || '',
    password: (form.querySelector('[name="password"]') || {}).value || '',
  };
  try {
    const res = await request(API_BASE_URL + 'auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    localStorage.setItem('user', JSON.stringify(res));
    showAlert('Login successful');
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('Login failed: ' + (err.message || err), 'error');
  }
}

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('theme', name);
}

function addThemeToggleButton() {
  const container = document.getElementById('theme-toggle-container');
  if (!container) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'themeToggleBtn';
  btn.textContent = localStorage.getItem('theme') === 'dark' ? '🌙' : '☀️';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => {
    const current = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    btn.textContent = next === 'dark' ? '🌙' : '☀️';
  });
  container.appendChild(btn);
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const collapsedKey = 'sidebarCollapsed';
  if (!sidebar) return;

  const collapsed = localStorage.getItem(collapsedKey) === 'true';
  if (collapsed) sidebar.classList.add('collapsed');

  if (toggle) toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(collapsedKey, sidebar.classList.contains('collapsed'));
  });

  function setActiveLink() {
    const page = document.body && document.body.dataset.page ? document.body.dataset.page : null;
    const links = qsa('#sidebar a');
    links.forEach(l => l.classList.remove('active'));
    if (page) {
      const match = qsa(`#sidebar a[data-page="${page}"]`)[0];
      if (match) match.classList.add('active');
    } else {
      const path = window.location.pathname.split('/').pop();
      const match = qsa(`#sidebar a[href*="${path}"]`)[0];
      if (match) match.classList.add('active');
    }
  }
  setActiveLink();
}

function init() {
  const page = document.body ? document.body.dataset.page : undefined;

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  addThemeToggleButton();

  initSidebar();

  requireAuth(page);

  if (page === 'dashboard') renderDashboard();
  if (page === 'agents') {
    loadAgents();
    const searchEl = document.getElementById('search');
    const roleFilter = document.getElementById('filter-role');
    const deptFilter = document.getElementById('filter-dept');
    const statusFilter = document.getElementById('filter-status');
    const agentsTbody = document.querySelector('#agents-table tbody');
    if (searchEl) searchEl.addEventListener('input', applySearchAndFilters);
    if (roleFilter) roleFilter.addEventListener('change', applySearchAndFilters);
    if (deptFilter) deptFilter.addEventListener('change', applySearchAndFilters);
    if (statusFilter) statusFilter.addEventListener('change', applySearchAndFilters);
    if (agentsTbody) agentsTbody.addEventListener('click', agentsTableHandler);
  }
  if (page === 'form') setupFormPage();
  if (page === 'login') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
  }
  if (page === 'logout') logout();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}