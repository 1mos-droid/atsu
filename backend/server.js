// server.js const express = require("express"); const cors = require("cors"); const path = require("path"); const fs = require("fs");

const app = express(); const PORT = process.env.PORT || 5000;

// --------------------------- // Middleware // --------------------------- app.use(cors({ origin: "*", // Allow all origins for now methods: "GET,POST,PUT,DELETE", allowedHeaders: "Content-Type" }));

app.use(express.json()); app.use(express.urlencoded({ extended: true }));

// Serve static frontend files app.use(express.static(path.join(__dirname, "../frontend")));

// Path to agents JSON file const jsonFilePath = path.join(__dirname, "agent.json");

// --------------------------- // Helper functions // --------------------------- function readJsonData() { try { if (fs.existsSync(jsonFilePath)) { const fileContent = fs.readFileSync(jsonFilePath, "utf-8"); return fileContent ? JSON.parse(fileContent) : []; } else { console.warn("agent.json not found, creating new file."); fs.writeFileSync(jsonFilePath, JSON.stringify([], null, 2), "utf-8"); return []; } } catch (err) { console.error("Error reading agent.json:", err); return []; } }

function writeJsonData(data) { try { fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), "utf-8"); console.log("Data saved successfully to agent.json"); } catch (err) { console.error("Failed to save data:", err); } }

// --------------------------- // Login Route // --------------------------- app.post("/api/login", (req, res) => { const { email, password } = req.body; console.log("Login attempt:", email);

if (email === "datnova@gmail.com" && password === "datnova@999") { return res.json({ success: true, message: "Login successful", user: { email, name: "Admin" }, }); } else { return res.status(401).json({ success: false, error: "Invalid email or password", }); } });

// --------------------------- // Agents API Routes // ---------------------------

// Get all agents app.get("/api/agents", (req, res) => { const agents = readJsonData(); res.json(agents); });

// Get agent by ID app.get("/api/agents/:id", (req, res) => { const { id } = req.params; const agents = readJsonData(); const agent = agents.find((a) => a.id === parseInt(id)); if (!agent) return res.status(404).json({ error: "Agent not found" }); res.json(agent); });

// Add new agent app.post("/api/agents", (req, res) => { console.log("Received new agent data:", req.body);

const { full_name, email, phone, address, role, department, status, date_of_joining } = req.body;

if (!full_name || !email) { return res.status(400).json({ error: "Full name and email are required" }); }

let agents = readJsonData(); const newAgent = { id: agents.length > 0 ? agents[agents.length - 1].id + 1 : 1, full_name, email, phone, address, role, department, status: status || "active", date_of_joining: date_of_joining || null, };

agents.push(newAgent); writeJsonData(agents); res.json(newAgent); });

// Update existing agent app.put("/api/agents/:id", (req, res) => { const { id } = req.params; const { full_name, email, phone, address, role, department, status, date_of_joining } = req.body;

let agents = readJsonData(); const agentIndex = agents.findIndex((a) => a.id === parseInt(id));

if (agentIndex === -1) { return res.status(404).json({ error: "Agent not found" }); }

agents[agentIndex] = { id: parseInt(id), full_name, email, phone, address, role, department, status: status || "active", date_of_joining: date_of_joining || null, };

writeJsonData(agents); res.json(agents[agentIndex]); });

// Delete agent app.delete("/api/agents/:id", (req, res) => { const { id } = req.params; let agents = readJsonData();

const newAgents = agents.filter((a) => a.id !== parseInt(id));

if (newAgents.length === agents.length) { return res.status(404).json({ error: "Agent not found" }); }

writeJsonData(newAgents); res.json({ message: "Agent deleted successfully" }); });

// --------------------------- // Fallback to Frontend // --------------------------- app.use((req, res) => { res.sendFile(path.join(__dirname, "../frontend", "login.html")); });

// --------------------------- // Start the server // --------------------------- app.listen(PORT, () => { console.log(\n🚀 Server running at http://localhost:${PORT}); });

