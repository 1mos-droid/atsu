const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Paths ----------
const DATA_FILE = path.join(__dirname, 'agents.json');
const FRONTEND_PATH = path.join(__dirname, '../frontend');

// ---------- Middleware ----------
app.use(cors());
app.use(express.json()); 
app.use(express.static(FRONTEND_PATH)); 

// ---------- Helpers ----------
const generateId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// Get all agents
app.get('/api/agents', (req, res) => {
  try {
    const agents = readAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  try {
    const agents = readAgents();
    const agent = agents.find(a => String(a.id) === String(req.params.id));

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Create new agent
app.post('/api/agents', (req, res) => {
  try {
    const { full_name, email, phone, address, role, department, status, date_of_joining } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }

    const agents = readAgents();
    const newAgent = {
      id: generateId(),
      full_name,
      email,
      phone: phone || '',
      address: address || '',
      role: role || '',
      department: department || '',
      status: status || 'active',
      date_of_joining: date_of_joining || null
    };

    agents.push(newAgent);
    writeAgents(agents);

    res.status(201).json(newAgent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
app.put('/api/agents/:id', (req, res) => {
  try {
    const agents = readAgents();
    const index = agents.findIndex(a => String(a.id) === String(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agents[index] = { ...agents[index], ...req.body, id: agents[index].id };
    writeAgents(agents);

    res.json(agents[index]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  try {
    const agents = readAgents();
    const index = agents.findIndex(a => String(a.id) === String(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const deletedAgent = agents.splice(index, 1)[0];
    writeAgents(agents);

    res.json({ message: 'Agent deleted successfully', agent: deletedAgent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ---------- Fallbacks ----------
// Handle all unmatched API routes
app.all('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// Serve frontend for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_PATH, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found');
  }
});

// ---------- Start server ----------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));