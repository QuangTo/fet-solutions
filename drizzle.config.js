require("dotenv").config();

module.exports = {
  schema: "./lib/db.js",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
};
