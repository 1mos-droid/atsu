const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'agents.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ---------------- Helpers ----------------
function readAgents() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading agents.json:', err);
    return [];
  }
}

function writeAgents(agents) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(agents, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing agents.json:', err);
    throw err;
  }
}

// Simple hardcoded users for login
const USERS = [
  {
    id: 1,
    email: 'admin@example.com',
    password: 'admin123', // in real apps, hash passwords!
    name: 'Admin User'
  },
  {
    id: 2,
    email: 'user@example.com',
    password: 'user123',
    name: 'Regular User'
  }
];

// ---------------- Routes ----------------

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  // Return user info without password
  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// GET all agents
app.get('/api/agents', (req, res) => {
  const agents = readAgents();
  res.json(agents);
});

// GET single agent
app.get('/api/agents/:id', (req, res) => {
  const agents = readAgents();
  const agent = agents.find(a => String(a.id) === String(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// POST create new agent
app.post('/api/agents', (req, res) => {
  const agents = readAgents();
  const newAgent = {
    id: Date.now(),
    full_name: req.body.full_name || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    role: req.body.role || '',
    department: req.body.department || '',
    status: req.body.status || 'active',
    date_of_joining: req.body.date_of_joining || null
  };
  agents.push(newAgent);
  writeAgents(agents);
  res.status(201).json(newAgent);
});

// PUT update agent
app.put('/api/agents/:id', (req, res) => {
  const agents = readAgents();
  const index = agents.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Agent not found' });

  const updated = { ...agents[index], ...req.body, id: agents[index].id };
  agents[index] = updated;
  writeAgents(agents);
  res.json(updated);
});

// DELETE agent
app.delete('/api/agents/:id', (req, res) => {
  let agents = readAgents();
  const index = agents.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Agent not found' });

  const deleted = agents.splice(index, 1);
  writeAgents(agents);
  res.json({ message: 'Agent deleted', agent: deleted[0] });
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});