require("dotenv").config();

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const schema = require("./schema");

let pool;
let db;

function requireDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return connectionString;

  const error = new Error("DATABASE_URL is missing. Add it to the API environment variables and redeploy.");
  error.code = "DATABASE_URL_MISSING";
  error.statusCode = 503;
  throw error;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });
  }

  return pool;
}

function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }

  return db;
}

module.exports = { getDb, getPool };
