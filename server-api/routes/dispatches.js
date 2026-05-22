const express = require("express");
const { requireRole } = require("../auth");
const dispatches = require("../domains/dispatches");

const router = express.Router();

router.get("/", requireRole("driver", "warehouse", "accountant"), async (request, response) => {
  response.json(await dispatches.listDispatches({
    customerId: request.query.customerId || null,
  }));
});

router.post("/", requireRole("driver", "warehouse"), async (request, response) => {
  response.status(201).json(await dispatches.createDispatch(request.body, request.user));
});

module.exports = router;
