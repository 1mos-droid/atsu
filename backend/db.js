const { Pool } = require("pg");
const { URL } = require("url");

let connectionString = process.env.DATABASE_URL;

// Force IPv4 by converting the hostname to IPv4
if (connectionString) {
  const parsedUrl = new URL(connectionString);
  if (parsedUrl.hostname.endsWith("supabase.co")) {
    // Use IPv4 host for Render compatibility
    parsedUrl.hostname = "db." + parsedUrl.hostname.split("db.")[1];
    connectionString = parsedUrl.toString() + "?sslmode=require";
  }
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};