const { cachedRead, cacheTtl } = require("../cache");
const repo = require("../repository");

function listInventory({ customerId = null } = {}) {
  return cachedRead(
    `inventory:${customerId || "all"}`,
    () => repo.inventoryRows(customerId),
    cacheTtl.operations,
  );
}

module.exports = { listInventory };
