// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend (from "../frontend" folder)
app.use(express.static(path.join(__dirname, "../frontend")));

// Path to JSON file
const jsonFilePath = path.join(__dirname, "agent.json");

// Helper: read all agents from JSON
function readJsonData() {
  if (fs.existsSync(jsonFilePath)) {
    const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
    return fileContent ? JSON.parse(fileContent) : [];
  }
  return [];
}

// Helper: write all agents to JSON
function writeJsonData(data) {
  fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), "utf-8");
}

// ========================
// API Routes
// ========================

// Get all agents
app.get("/api/agents", (req, res) => {
  const agents = readJsonData();
  res.json(agents);
});

// Get single agent
app.get("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  const agents = readJsonData();
  const agent = agents.find((a) => a.id === parseInt(id));
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

// Add new agent
app.post("/api/agents", (req, res) => {
  const { full_name, email, phone, role, department, status } = req.body;

  let agents = readJsonData();
  const newAgent = {
    id: agents.length > 0 ? agents[agents.length - 1].id + 1 : 1,
    full_name,
    email,
    phone,
    role,
    department,
    status
  };

  agents.push(newAgent);
  writeJsonData(agents);

  res.json(newAgent);
});

// Update agent
app.put("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, role, department, status } = req.body;

  let agents = readJsonData();
  let agentIndex = agents.findIndex((a) => a.id === parseInt(id));

  if (agentIndex === -1) {
    return res.status(404).json({ error: "Agent not found" });
  }

  agents[agentIndex] = {
    id: parseInt(id),
    full_name,
    email,
    phone,
    role,
    department,
    status
  };

  writeJsonData(agents);

  res.json(agents[agentIndex]);
});

// Delete agent
app.delete("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  let agents = readJsonData();

  const newAgents = agents.filter((a) => a.id !== parseInt(id));

  if (newAgents.length === agents.length) {
    return res.status(404).json({ error: "Agent not found" });
  }

  writeJsonData(newAgents);
  res.json({ message: "Agent deleted successfully" });
});

// ========================
// Catch-all: serve frontend index.html
// ========================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
