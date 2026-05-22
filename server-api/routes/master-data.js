const express = require("express");
const { requireRole } = require("../auth");
const masterData = require("../domains/master-data");

const router = express.Router();

function resourceRouter(resource) {
  const child = express.Router();

  child.get("/", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
    response.json(await masterData.listMaster(resource));
  });

  child.post("/", requireRole("warehouse"), async (request, response) => {
    response.status(201).json(await masterData.createMaster(resource, request.body, request.user));
  });

  child.patch("/:id", requireRole("warehouse"), async (request, response) => {
    const item = await masterData.updateMaster(resource, request.params.id, request.body, request.user);
    if (!item) {
      response.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    response.json(item);
  });

  child.delete("/:id", requireRole("warehouse"), async (request, response) => {
    const item = await masterData.deleteMaster(resource, request.params.id, request.user);
    if (!item) {
      response.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    response.status(204).end();
  });

  return child;
}

router.use("/customers", resourceRouter("customers"));
router.use("/vehicles", resourceRouter("vehicles"));
router.use("/drivers", resourceRouter("drivers"));

module.exports = router;
