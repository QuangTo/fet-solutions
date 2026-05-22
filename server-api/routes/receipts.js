const express = require("express");
const { requireRole } = require("../auth");
const receipts = require("../domains/receipts");

const router = express.Router();

router.get("/", requireRole("driver", "warehouse"), async (request, response) => {
  response.json(await receipts.listReceipts({
    customerId: request.query.customerId || null,
  }));
});

router.post("/", requireRole("driver", "warehouse"), async (request, response) => {
  response.status(201).json(await receipts.createReceipt(request.body, request.user));
});

module.exports = router;
