
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
throw new Error(Request failed (${res.status}): ${txt});
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

// ---------- Helpers ----------
function escapeHtml(str) {
return String(str)
.replace(/&/g, '&')
.replace(/</g, '<')
.replace(/>/g, '>')
.replace(/"/g, '"')
.replace(/'/g, ''');
}

// Fix: fillForm had incorrect if/else formatting
function fillForm(a) {
const setIf = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
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
if (dojEl) dojEl.value = a.date_of_joining.split('T')[0];
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

// ---------- Dashboard ----------
async function renderDashboard() {
try {
const agents = await request(API_BASE_URL + 'agents');
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

// ---------- Agents ----------
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

// Fixed minor inconsistencies in populateFilters
function populateFilters(agents) {
const roles = Array.from(new Set(agents.map(a => a.role || '').filter(Boolean))).sort();
const depts = Array.from(new Set(agents.map(a => a.department || '').filter(Boolean))).sort();

const roleEl = document.getElementById('filter-role');
const deptEl = document.getElementById('filter-dept');

if (roleEl) {
roleEl.innerHTML =
'<option value="">All Roles</option>' + roles.map(r => <option value="${escapeHtml(r)}">${escapeHtml(r)}</option>).join('');
}
if (deptEl) {
deptEl.innerHTML =
'<option value="">All Departments</option>' + depts.map(d => <option value="${escapeHtml(d)}">${escapeHtml(d)}</option>).join('');
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
tr.innerHTML =     <td>${a.id || ''}</td>     <td>${escapeHtml(a.full_name || '')}</td>     <td>${escapeHtml(a.email || '')}</td>     <td>${escapeHtml(a.phone || '')}</td>     <td>${escapeHtml(a.role || '')}</td>     <td>${escapeHtml(a.department || '')}</td>     <td><span class="status ${statusClass}">${escapeHtml(a.status || '')}</span></td>     <td>     <button class="btn-edit">Edit</button>     <button class="btn-delete">Delete</button>     </td>    ;
tbody.appendChild(tr);
}
}

// ---------- Init ----------
function init() {
const page = document.body ? document.body.dataset.page : undefined;

// Apply persisted theme
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);
addThemeToggleButton();

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
const loginForm = document.getElementById("loginForm");
if (loginForm) loginForm.addEventListener("submit", handleLogin);
}
if (page === 'logout') logout();
}

