const { getPool } = require("./db/client");

async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

async function queryOne(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows[0] || null;
}

async function transaction(work) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function audit(client, user, action, entityType, entityId, meta = {}) {
  await client.query(
    `
      insert into audit_logs (user_id, user_role, action, entity_type, entity_id, meta)
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [user.id, user.role, action, entityType, entityId, JSON.stringify(meta)],
  );
}

async function listMaster(table, orderColumn) {
  return query(
    `select id, ${orderColumn} as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     from ${table}
     where is_active = true
     order by ${orderColumn}`,
  );
}

async function masterData() {
  const row = await queryOne(`
    select
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from customers
          where is_active = true
          order by name
        ) item
      ), '[]'::json) as customers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from drivers
          where is_active = true
          order by name
        ) item
      ), '[]'::json) as drivers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, plate as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from vehicles
          where is_active = true
          order by plate
        ) item
      ), '[]'::json) as vehicles
  `);

  return {
    customers: row.customers || [],
    drivers: row.drivers || [],
    vehicles: row.vehicles || [],
  };
}

function receiptDataSql(includeInventory = true) {
  return `
    select
      coalesce((
        select json_agg(json_build_object(
          'id', item.id,
          'date', item.date,
          'customerId', item."customerId",
          'customer', item.customer,
          'receivedByName', item."receivedByName",
          'items', item.items
        ) order by item.date desc, item."createdAt" desc)
        from (
          select
            r.id,
            r.received_date as date,
            c.id as "customerId",
            c.name as customer,
            r.received_by_name as "receivedByName",
            r.created_at as "createdAt",
            json_agg(json_build_object(
              'id', ri.id,
              'sku', ri.sku,
              'quantity', ri.quantity::float,
              'unit', ri.unit
            ) order by ri.sku) as items
          from receipts r
          join customers c on c.id = r.customer_id
          join receipt_items ri on ri.receipt_id = r.id
          group by r.id, c.id, c.name
          order by r.received_date desc, r.created_at desc
          limit 500
        ) item
      ), '[]'::json) as receipts
      ${includeInventory ? `,
      ${inventoryJsonSql()} as inventory` : ""}
  `;
}

function dispatchDataSql(includeInventory = true) {
  return `
    select
      coalesce((
        select json_agg(row_to_json(item) order by item.date desc, item."createdAt" desc)
        from (
          select
            d.id,
            d.dispatch_date as date,
            c.id as "customerId",
            c.name as customer,
            v.id as "vehicleId",
            v.plate,
            dr.id as "driverId",
            dr.name as driver,
            d.warehouse_name as warehouse,
            d.created_at as "createdAt",
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
          group by d.id, c.id, c.name, v.id, v.plate, dr.id, dr.name
          order by d.dispatch_date desc, d.created_at desc
          limit 500
        ) item
      ), '[]'::json) as dispatches
      ${includeInventory ? `,
      ${inventoryJsonSql()} as inventory` : ""}
  `;
}

function inventoryJsonSql() {
  return `coalesce((
    with receipts_by_customer_sku as (
      select
        c.id as customer_id,
        c.name as customer_name,
        ri.sku,
        coalesce(max(ri.unit), 'đơn vị') as unit,
        sum(ri.quantity) as received_quantity
      from customers c
      join receipts r on r.customer_id = c.id
      join receipt_items ri on ri.receipt_id = r.id
      group by c.id, c.name, ri.sku
    ),
    dispatches_by_customer_sku as (
      select
        d.customer_id,
        di.sku,
        sum(di.quantity) as dispatched_quantity
      from dispatches d
      join dispatch_items di on di.dispatch_id = d.id
      group by d.customer_id, di.sku
    )
    select json_agg(row_to_json(item) order by item.customer, item.sku)
    from (
      select
        r.customer_id as "customerId",
        r.customer_name as customer,
        r.sku,
        r.unit,
        r.received_quantity::float as "receivedQuantity",
        coalesce(d.dispatched_quantity, 0)::float as "dispatchedQuantity",
        (r.received_quantity - coalesce(d.dispatched_quantity, 0))::float as "remainingQuantity"
      from receipts_by_customer_sku r
      left join dispatches_by_customer_sku d
        on d.customer_id = r.customer_id and d.sku = r.sku
      order by r.customer_name, r.sku
    ) item
  ), '[]'::json)`;
}

async function operationsData() {
  const row = await queryOne(`
    select
      receipt_data.receipts,
      dispatch_data.dispatches,
      ${inventoryJsonSql()} as inventory
    from (${receiptDataSql(false)}) receipt_data
    cross join (${dispatchDataSql(false)}) dispatch_data
  `);

  return {
    dispatches: row.dispatches || [],
    inventory: row.inventory || [],
    receipts: row.receipts || [],
  };
}

async function receiptData() {
  const row = await queryOne(receiptDataSql());
  return {
    inventory: row.inventory || [],
    receipts: row.receipts || [],
  };
}

async function dispatchData() {
  const row = await queryOne(dispatchDataSql());
  return {
    dispatches: row.dispatches || [],
    inventory: row.inventory || [],
  };
}

async function reportData() {
  const row = await queryOne(`
    select
      coalesce((
        with receipts_by_customer_sku as (
          select
            c.id as customer_id,
            c.name as customer,
            ri.sku,
            sum(ri.quantity) as received_quantity
          from customers c
          join receipts r on r.customer_id = c.id
          join receipt_items ri on ri.receipt_id = r.id
          group by c.id, c.name, ri.sku
        ),
        dispatches_by_customer_sku as (
          select
            d.customer_id,
            di.sku,
            sum(di.quantity) as dispatched_quantity
          from dispatches d
          join dispatch_items di on di.dispatch_id = d.id
          group by d.customer_id, di.sku
        ),
        inventory as (
          select
            r.customer_id,
            r.customer,
            sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity,
            count(*) as item_count
          from receipts_by_customer_sku r
          left join dispatches_by_customer_sku d
            on d.customer_id = r.customer_id and d.sku = r.sku
          group by r.customer_id, r.customer
        )
        select json_agg(row_to_json(item) order by item.customer)
        from (
          select
            i.customer_id as "customerId",
            i.customer,
            i.item_count::int as "itemCount"
          from inventory i
          left join invoice_approvals ia on ia.customer_id = i.customer_id
          where i.remaining_quantity = 0 and ia.id is null
          order by i.customer
        ) item
      ), '[]'::json) as "billingReady",
      coalesce((
        select json_agg(json_build_object(
          'id', item.id,
          'date', item.date,
          'status', item.status,
          'customerId', item."customerId",
          'customer', item.customer,
          'approvedByName', item."approvedByName"
        ) order by item.date desc, item."createdAt" desc)
        from (
          select
            ia.id,
            ia.approval_date as date,
            ia.status,
            c.id as "customerId",
            c.name as customer,
            ia.approved_by_name as "approvedByName",
            ia.created_at as "createdAt"
          from invoice_approvals ia
          join customers c on c.id = ia.customer_id
          order by ia.approval_date desc, ia.created_at desc
          limit 500
        ) item
      ), '[]'::json) as "invoiceApprovals"
  `);

  return {
    billingReady: row.billingReady || [],
    invoiceApprovals: row.invoiceApprovals || [],
  };
}

async function createNamedMaster({ table, column, value, user, entityType }) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        insert into ${table} (${column})
        values ($1)
        on conflict (${column}) do update
        set is_active = true, updated_at = now()
        returning *
      `,
      [value],
    );
    await audit(client, user, "create", entityType, result.rows[0].id, {
      [column]: value,
    });
    return result.rows[0];
  });
}

async function updateNamedMaster({ table, column, id, value, user, entityType }) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        update ${table}
        set ${column} = $1, updated_at = now()
        where id = $2 and is_active = true
        returning *
      `,
      [value, id],
    );
    if (!result.rowCount) return null;
    await audit(client, user, "update", entityType, id, { [column]: value });
    return result.rows[0];
  });
}

async function assertCustomerCanBeDeleted(client, customerId) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
        group by di.sku
      ),
      inventory as (
        select
          coalesce(sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)), 0) as remaining_quantity,
          count(*) as item_count
        from receipts_by_sku r
        left join dispatches_by_sku d on d.sku = r.sku
      )
      select
        i.remaining_quantity::float as "remainingQuantity",
        i.item_count::int as "itemCount",
        exists (
          select 1
          from invoice_approvals ia
          where ia.customer_id = $1
        ) as "hasInvoiceApproval"
      from inventory i
    `,
    [customerId],
  );

  const usage = result.rows[0] || {
    remainingQuantity: 0,
    itemCount: 0,
    hasInvoiceApproval: false,
  };

  if (Number(usage.remainingQuantity) > 0) {
    const error = new Error("Không thể xóa khách hàng này vì vẫn còn hàng trong kho.");
    error.statusCode = 409;
    error.code = "CUSTOMER_DELETE_BLOCKED";
    throw error;
  }

  if (Number(usage.itemCount) > 0 && !usage.hasInvoiceApproval) {
    const error = new Error("Không thể xóa khách hàng này vì còn báo cáo cần xuất hóa đơn.");
    error.statusCode = 409;
    error.code = "CUSTOMER_DELETE_BLOCKED";
    throw error;
  }
}

async function softDeleteMaster({ table, id, user, entityType }) {
  return transaction(async (client) => {
    if (table === "customers") {
      const customer = await client.query(
        "select id from customers where id = $1 and is_active = true",
        [id],
      );
      if (!customer.rowCount) return null;
      await assertCustomerCanBeDeleted(client, id);
    }

    const result = await client.query(
      `
        update ${table}
        set is_active = false, updated_at = now()
        where id = $1 and is_active = true
        returning *
      `,
      [id],
    );
    if (!result.rowCount) return null;
    await audit(client, user, "delete", entityType, id);
    return result.rows[0];
  });
}

async function ensureCustomer(client, { customerId, customerName }) {
  if (customerId) return customerId;
  const result = await client.query(
    `
      insert into customers (name)
      values ($1)
      on conflict (name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [customerName],
  );
  return result.rows[0].id;
}

async function ensureVehicle(client, { vehicleId, plate }) {
  if (vehicleId) return vehicleId;
  const result = await client.query(
    `
      insert into vehicles (plate)
      values ($1)
      on conflict (plate) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [plate],
  );
  return result.rows[0].id;
}

async function ensureDriver(client, { driverId, driverName }) {
  if (driverId) return driverId;
  const result = await client.query(
    `
      insert into drivers (name)
      values ($1)
      on conflict (name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [driverName],
  );
  return result.rows[0].id;
}

async function availableInventory(client, customerId, skus = []) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, coalesce(max(ri.unit), 'đơn vị') as unit, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
          and (coalesce(array_length($2::text[], 1), 0) = 0 or ri.sku = any($2::text[]))
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
          and (coalesce(array_length($2::text[], 1), 0) = 0 or di.sku = any($2::text[]))
        group by di.sku
      )
      select
        r.sku,
        r.unit,
        r.received_quantity::float as "receivedQuantity",
        coalesce(d.dispatched_quantity, 0)::float as "dispatchedQuantity",
        (r.received_quantity - coalesce(d.dispatched_quantity, 0))::float as "remainingQuantity"
      from receipts_by_sku r
      left join dispatches_by_sku d on d.sku = r.sku
      order by r.sku
    `,
    [customerId, skus],
  );
  return result.rows;
}

async function createReceipt(data, user) {
  return transaction(async (client) => {
    const customerId = await ensureCustomer(client, data);
    const receipt = await client.query(
      `
        insert into receipts (customer_id, received_by_id, received_by_name, received_date)
        values ($1, $2, $3, $4)
        returning *
      `,
      [customerId, user.id, data.receivedByName || user.name, data.date],
    );

    await client.query(
      `
        insert into receipt_items (receipt_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
      `,
      [receipt.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, user, "create", "receipt", receipt.rows[0].id, {
      customerId,
      itemCount: data.items.length,
    });
    return receipt.rows[0];
  });
}

async function createDispatch(data, user) {
  return transaction(async (client) => {
    const customerId = await ensureCustomer(client, data);
    const vehicleId = await ensureVehicle(client, data);
    const driverId = await ensureDriver(client, data);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`dispatch:${customerId}`]);
    const requestedSkus = Array.from(new Set(data.items.map((item) => item.sku)));
    const inventory = await availableInventory(client, customerId, requestedSkus);
    const remainingBySku = new Map(
      inventory.map((row) => [row.sku, Number(row.remainingQuantity)]),
    );

    for (const item of data.items) {
      const remaining = remainingBySku.get(item.sku) || 0;
      if (Number(item.quantity) > remaining) {
        const error = new Error(`Số lượng ${item.sku} vượt tồn khả dụng.`);
        error.statusCode = 409;
        error.code = "INSUFFICIENT_INVENTORY";
        throw error;
      }
      remainingBySku.set(item.sku, remaining - Number(item.quantity));
    }

    const dispatch = await client.query(
      `
        insert into dispatches (
          customer_id, vehicle_id, driver_id, warehouse_user_id, warehouse_name, dispatch_date
        )
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [
        customerId,
        vehicleId,
        driverId,
        user.id,
        data.warehouseName || user.name,
        data.date,
      ],
    );

    await client.query(
      `
        insert into dispatch_items (dispatch_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
      `,
      [dispatch.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, user, "create", "dispatch", dispatch.rows[0].id, {
      customerId,
      vehicleId,
      driverId,
      itemCount: data.items.length,
    });
    return dispatch.rows[0];
  });
}

async function inventoryRows(customerId = null) {
  return query(
    `
      with receipts_by_customer_sku as (
        select
          c.id as customer_id,
          c.name as customer_name,
          ri.sku,
          coalesce(max(ri.unit), 'đơn vị') as unit,
          sum(ri.quantity) as received_quantity
        from customers c
        join receipts r on r.customer_id = c.id
        join receipt_items ri on ri.receipt_id = r.id
        where ($1::uuid is null or c.id = $1)
        group by c.id, c.name, ri.sku
      ),
      dispatches_by_customer_sku as (
        select
          d.customer_id,
          di.sku,
          sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where ($1::uuid is null or d.customer_id = $1)
        group by d.customer_id, di.sku
      )
      select
        r.customer_id as "customerId",
        r.customer_name as customer,
        r.sku,
        r.unit,
        r.received_quantity::float as "receivedQuantity",
        coalesce(d.dispatched_quantity, 0)::float as "dispatchedQuantity",
        (r.received_quantity - coalesce(d.dispatched_quantity, 0))::float as "remainingQuantity"
      from receipts_by_customer_sku r
      left join dispatches_by_customer_sku d
        on d.customer_id = r.customer_id and d.sku = r.sku
      order by r.customer_name, r.sku
    `,
    [customerId],
  );
}

async function billingReadyCustomers() {
  return query(`
    with receipts_by_customer_sku as (
      select
        c.id as customer_id,
        c.name as customer,
        ri.sku,
        sum(ri.quantity) as received_quantity
      from customers c
      join receipts r on r.customer_id = c.id
      join receipt_items ri on ri.receipt_id = r.id
      group by c.id, c.name, ri.sku
    ),
    dispatches_by_customer_sku as (
      select
        d.customer_id,
        di.sku,
        sum(di.quantity) as dispatched_quantity
      from dispatches d
      join dispatch_items di on di.dispatch_id = d.id
      group by d.customer_id, di.sku
    ),
    inventory as (
      select
        r.customer_id,
        r.customer,
        sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity,
        count(*) as item_count
      from receipts_by_customer_sku r
      left join dispatches_by_customer_sku d
        on d.customer_id = r.customer_id and d.sku = r.sku
      group by r.customer_id, r.customer
    )
    select
      i.customer_id as "customerId",
      i.customer,
      i.item_count::int as "itemCount"
    from inventory i
    left join invoice_approvals ia on ia.customer_id = i.customer_id
    where i.remaining_quantity = 0 and ia.id is null
    order by i.customer
  `);
}

async function createInvoiceApproval(data, user) {
  return transaction(async (client) => {
    const approval = await client.query(
      `
        insert into invoice_approvals (
          customer_id, approved_by_id, approved_by_name, approval_date, status
        )
        values ($1, $2, $3, $4, $5)
        on conflict (customer_id) do update
        set approved_by_id = excluded.approved_by_id,
            approved_by_name = excluded.approved_by_name,
            approval_date = excluded.approval_date,
            status = excluded.status,
            updated_at = now()
        returning *
      `,
      [
        data.customerId,
        user.id,
        data.approvedByName || user.name,
        data.approvalDate || new Date().toISOString().slice(0, 10),
        data.status,
      ],
    );
    await audit(client, user, "create", "invoice_approval", approval.rows[0].id, {
      customerId: data.customerId,
    });
    return approval.rows[0];
  });
}

module.exports = {
  billingReadyCustomers,
  createDispatch,
  createInvoiceApproval,
  createNamedMaster,
  createReceipt,
  dispatchData,
  inventoryRows,
  listMaster,
  masterData,
  operationsData,
  query,
  queryOne,
  receiptData,
  reportData,
  softDeleteMaster,
  updateNamedMaster,
};
