const express = require("express");
const { requireRole } = require("../auth");
const inventory = require("../domains/inventory");

const router = express.Router();

router.get("/", requireRole("driver", "warehouse", "accountant"), async (request, response) => {
  response.json(await inventory.listInventory({
    customerId: request.query.customerId || null,
  }));
});

module.exports = router;
