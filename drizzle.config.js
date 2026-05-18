require("dotenv").config();

module.exports = {
  schema: "./api/db/schema.js",
  out: "./api/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
};
