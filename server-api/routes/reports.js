const express = require("express");
const { requireRole } = require("../auth");
const reports = require("../domains/reports");

const router = express.Router();

router.get("/reports/billing-ready", requireRole("accountant"), async (_request, response) => {
  response.json(await reports.billingReadyCustomers());
});

router.get("/invoice-approvals", requireRole("accountant"), async (_request, response) => {
  response.json(await reports.listInvoiceApprovals());
});

router.post("/invoice-approvals", requireRole("accountant"), async (request, response) => {
  response.status(201).json(await reports.createInvoiceApproval(request.body, request.user));
});

module.exports = router;
