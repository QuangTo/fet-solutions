const express = require("express");
const { requireRole } = require("../auth");
const settings = require("../domains/settings");

const router = express.Router();

router.get("/", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await settings.listSettings());
});

router.put("/:key", requireRole("admin"), async (request, response) => {
  response.json(await settings.upsertSetting(request.params.key, request.body));
});

module.exports = router;
