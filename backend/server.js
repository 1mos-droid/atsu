
// server.js
const db = require("./db");
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend (from "../frontend" folder)
app.use(express.static(path.join(__dirname, "../frontend")));

// ========================
// API Routes
// ========================

// Simple login route (still demo, you can connect this to DB later)
app.post("/api/login", (req, res) => {
const { email, password } = req.body;

const demoUser = { email: "datnova@gmail.com", password: "datnova@999" };

if (email === demoUser.email && password === demoUser.password) {
res.json({ success: true, user: { email } });
} else {
res.status(401).json({ success: false, error: "Invalid email or password" });
}
});

// ========================
// Agents CRUD with Supabase/Postgres
// ========================

// Get all agents
app.get("/api/agents", async (req, res) => {
try {
const { rows } = await db.query("SELECT * FROM agents ORDER BY id ASC");
res.json(rows);
} catch (err) {
console.error(err);
res.status(500).json({ error: "Database error" });
}
});

// Get single agent
app.get("/api/agents/:id", async (req, res) => {
try {
const { rows } = await db.query("SELECT * FROM agents WHERE id = $1", [
req.params.id,
]);
if (rows.length === 0)
return res.status(404).json({ error: "Agent not found" });
res.json(rows[0]);
} catch (err) {
console.error(err);
res.status(500).json({ error: "Database error" });
}
});

// Add new agent
app.post("/api/agents", async (req, res) => {
const { full_name, email, phone, role, department, status } = req.body;
try {
const { rows } = await db.query(
INSERT INTO agents (full_name, email, phone, role, department, status)   VALUES ($1, $2, $3, $4, $5, $6)   RETURNING *,
[full_name, email, phone, role, department, status]
);
res.json(rows[0]);
} catch (err) {
console.error(err);
res.status(500).json({ error: "Database error" });
}
});

// Update agent
app.put("/api/agents/:id", async (req, res) => {
const { full_name, email, phone, role, department, status } = req.body;
try {
const { rows } = await db.query(
UPDATE agents   SET full_name = $1, email = $2, phone = $3, role = $4, department = $5, status = $6   WHERE id = $7   RETURNING *,
[full_name, email, phone, role, department, status, req.params.id]
);
if (rows.length === 0)
return res.status(404).json({ error: "Agent not found" });
res.json(rows[0]);
} catch (err) {
console.error(err);
res.status(500).json({ error: "Database error" });
}
});

// Delete agent
app.delete("/api/agents/:id", async (req, res) => {
try {
const { rowCount } = await db.query("DELETE FROM agents WHERE id = $1", [
req.params.id,
]);
if (rowCount === 0)
return res.status(404).json({ error: "Agent not found" });
res.json({ message: "Agent deleted successfully" });
} catch (err) {
console.error(err);
res.status(500).json({ error: "Database error" });
}
});

// ========================
// Catch-all: serve frontend login.html (force login first)
// ========================
app.use((req, res) => {
res.sendFile(path.join(__dirname, "../frontend", "login.html"));
});

// Start server
app.listen(PORT, () => {
console.log(🚀 Server running at http://localhost:${PORT});
});

