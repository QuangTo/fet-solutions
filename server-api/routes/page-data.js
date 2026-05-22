const express = require("express");
const { requireRole } = require("../auth");
const pageData = require("../domains/page-data");

const router = express.Router();

router.get("/app-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await pageData.loadAppData());
});

router.get("/master-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await pageData.loadMasterData());
});

router.get("/operations-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await pageData.loadOperationsData());
});

router.get("/receipt-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await pageData.loadReceiptData());
});

router.get("/dispatch-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await pageData.loadDispatchData());
});

router.get("/report-data", requireRole("accountant"), async (_request, response) => {
  response.json(await pageData.loadReportData());
});

module.exports = router;
