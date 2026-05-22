const repo = require("../repository");
const { writeThrough } = require("../cache");
const { dispatchSchema } = require("../validators");

function listDispatches({ customerId = null } = {}) {
  return repo.query(
    `
      select
        d.id,
        d.dispatch_date as date,
        c.id as "customerId",
        c.name as customer,
        v.plate,
        dr.name as driver,
        d.warehouse_name as warehouse,
        json_agg(json_build_object(
          'id', di.id,
          'sku', di.sku,
          'quantity', di.quantity::float,
          'unit', di.unit
        ) order by di.sku) as items
      from dispatches d
      join customers c on c.id = d.customer_id
      join vehicles v on v.id = d.vehicle_id
      join drivers dr on dr.id = d.driver_id
      join dispatch_items di on di.dispatch_id = d.id
      where ($1::uuid is null or c.id = $1)
      group by d.id, c.id, c.name, v.plate, dr.name
      order by d.dispatch_date desc, d.created_at desc
      limit 200
    `,
    [customerId],
  );
}

function createDispatch(payload, user) {
  return writeThrough(
    () => repo.createDispatch(dispatchSchema.parse(payload), user),
    ["master", "operations", "report"],
  );
}

module.exports = {
  createDispatch,
  listDispatches,
};
