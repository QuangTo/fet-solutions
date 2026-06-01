require("dotenv").config();

// IMPORTANT: This is the production/staging schema migration runner.
// It applies every SQL file in drizzle/migrations exactly once and should be
// kept. Do not use it for sample/demo data resets.

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const migrationsDir = path.join(__dirname, "../../drizzle/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        "select 1 from schema_migrations where name = $1",
        [file],
      );
      if (alreadyApplied.rowCount) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
