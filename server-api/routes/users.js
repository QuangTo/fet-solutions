const express = require("express");
const { requireRole } = require("../auth");
const users = require("../domains/users");

const router = express.Router();

router.get("/", requireRole("admin"), async (_request, response) => {
  response.json(await users.listUsers());
});

router.post("/", requireRole("admin"), async (request, response) => {
  response.status(201).json(await users.createUser(request.body));
});

router.patch("/:id", requireRole("admin"), async (request, response) => {
  const item = await users.updateUser(request.params.id, request.body);
  if (!item) {
    response.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  response.json(item);
});

router.delete("/:id", requireRole("admin"), async (request, response) => {
  const item = await users.deleteUser(request.params.id);
  if (!item) {
    response.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  response.status(204).end();
});

module.exports = router;
