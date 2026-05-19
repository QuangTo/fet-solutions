require("dotenv").config();

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const schema = require("./schema");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for the API server.");
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

module.exports = { db, pool };
