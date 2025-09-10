const { Pool } = require("pg");

// Force Node.js to prefer IPv4 over IPv6
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first";

// Get DATABASE_URL from environment variables
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not set in environment variables");
}

// Ensure `sslmode=require` is appended correctly
if (!connectionString.includes("sslmode=require")) {
  if (connectionString.includes("?")) {
    connectionString += "&sslmode=require";
  } else {
    connectionString += "?sslmode=require";
  }
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required by Supabase
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};