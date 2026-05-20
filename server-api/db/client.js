require("dotenv").config();

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const schema = require("./schema");

let pool;
let db;

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

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
      connectionTimeoutMillis: numberEnv("PG_CONNECTION_TIMEOUT_MS", 5_000),
      connectionString: requireDatabaseUrl(),
      idleTimeoutMillis: numberEnv("PG_IDLE_TIMEOUT_MS", 10_000),
      max: numberEnv("PG_POOL_MAX", process.env.VERCEL ? 3 : 10),
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
