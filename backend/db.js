const { Pool } = require("pg");

// Ensure DATABASE_URL is set
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not set in environment variables");
}

// Make sure sslmode=require is appended
if (!connectionString.includes("sslmode=require")) {
  connectionString += connectionString.includes("?")
    ? "&sslmode=require"
    : "?sslmode=require";
}

// Explicitly extract Supabase details to avoid IPv6 issues
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  host: "db.ljgquxakwseeljdxxfyx.supabase.co", // Supabase hostname
  port: 5432,
  // Force IPv4
  connectionTimeoutMillis: 5000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};