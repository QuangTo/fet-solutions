require("dotenv").config();

module.exports = {
  schema: "./server-api/db/schema.js",
  out: "./server-api/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
};
