const repo = require("../repository");
const { writeThrough } = require("../cache");
const { receiptSchema } = require("../validators");

function listReceipts({ customerId = null } = {}) {
  return repo.query(
    `
      select
        r.id,
        r.received_date as date,
        c.id as "customerId",
        c.name as customer,
        r.received_by_name as "receivedByName",
        json_agg(json_build_object(
          'id', ri.id,
          'sku', ri.sku,
          'quantity', ri.quantity::float,
          'unit', ri.unit
        ) order by ri.sku) as items
      from receipts r
      join customers c on c.id = r.customer_id
      join receipt_items ri on ri.receipt_id = r.id
      where ($1::uuid is null or c.id = $1)
      group by r.id, c.id, c.name
      order by r.received_date desc, r.created_at desc
      limit 200
    `,
    [customerId],
  );
}

function createReceipt(payload, user) {
  return writeThrough(
    () => repo.createReceipt(receiptSchema.parse(payload), user),
    ["master", "operations", "report"],
  );
}

module.exports = {
  createReceipt,
  listReceipts,
};
