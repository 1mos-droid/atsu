const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Paths ----------
const DATA_FILE = path.join(__dirname, 'agents.json'); // backend/agents.json
const FRONTEND_PATH = path.join(__dirname, '../frontend'); // frontend folder is one level up

// ---------- Middleware ----------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(FRONTEND_PATH)); // serve frontend files

// ---------- Helpers ----------
const readAgents = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading agents.json:', err);
    return [];
  }
};

const writeAgents = (agents) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(agents, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing agents.json:', err);
    throw err;
  }
};

// ---------- Hardcoded Users ----------
const USERS = [
  { id: 1, email: 'admin@example.com', password: 'admin123', name: 'Admin User' },
  { id: 2, email: 'user@example.com', password: 'user123', name: 'Regular User' }
];

// ---------- API Routes ----------

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// Get all agents
app.get('/api/agents', (req, res) => {
  res.json(readAgents());
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  const agent = readAgents().find(a => String(a.id) === String(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Create new agent
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

// Update agent
app.put('/api/agents/:id', (req, res) => {
  const agents = readAgents();
  const index = agents.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Agent not found' });

  agents[index] = { ...agents[index], ...req.body, id: agents[index].id };
  writeAgents(agents);
  res.json(agents[index]);
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  const agents = readAgents();
  const index = agents.findIndex(a => String(a.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Agent not found' });

  const deleted = agents.splice(index, 1)[0];
  writeAgents(agents);
  res.json({ message: 'Agent deleted', agent: deleted });
});

// ---------- Fallbacks ----------
// Handle all unmatched API routes
app.all('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// Serve frontend for all other routes
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'index.html')));

// ---------- Start server ----------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));