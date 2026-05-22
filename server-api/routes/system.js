const express = require("express");
const { pageAccess, roles } = require("../roles");
const repo = require("../repository");

const router = express.Router();

router.get("/health", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ ok: true });
});

router.get("/ready", async (_request, response) => {
  await repo.query("select 1 as ok");
  response.setHeader("Cache-Control", "no-store");
  response.json({ ok: true });
});

router.get("/access", (_request, response) => {
  response.json({ roles, pageAccess });
});

module.exports = router;
