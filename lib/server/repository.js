const { getPool } = require("../db");

async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

async function queryOne(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows[0] || null;
}

async function defaultSite() {
  return queryOne(`
    select
      s.id,
      s.name,
      s.code,
      s.status,
      s.billing_status as "billingStatus",
      s.trial_started_at as "trialStartedAt",
      s.trial_ends_at as "trialEndsAt",
      o.id as "organizationId",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    from sites s
    join organizations o on o.id = s.organization_id
    where o.slug = 'default' and s.code = 'default'
    limit 1
  `);
}

async function resolveSiteId(siteId = null) {
  if (siteId) return siteId;
  const site = await defaultSite();
  if (!site?.id) {
    const error = new Error("Chưa có site mặc định. Hãy chạy migration site/billing.");
    error.code = "SITE_NOT_READY";
    error.statusCode = 503;
    throw error;
  }
  return site.id;
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
      insert into audit_logs (site_id, user_id, user_role, action, entity_type, entity_id, meta)
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      user.siteId || null,
      user.id,
      user.role,
      action,
      entityType,
      entityId,
      JSON.stringify(meta),
    ],
  );
}

async function listSites(userId = null) {
  return query(
    `
      select
        s.id,
        s.name,
        s.code,
        s.status,
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        o.id as "organizationId",
        o.name as "organizationName",
        o.slug as "organizationSlug",
        sm.role
      from sites s
      join organizations o on o.id = s.organization_id
      left join site_memberships sm
        on sm.site_id = s.id
        and sm.is_active = true
        and ($1::uuid is not null and sm.user_id = $1)
      where $1::uuid is null or sm.user_id = $1
      order by o.name, s.name
    `,
    [userId],
  );
}

async function billingSummary(siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return queryOne(
    `
      select
        s.id as "siteId",
        s.name as "siteName",
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        coalesce((
          select row_to_json(item)
          from (
            select
              sub.id,
              sub.status,
              sub.current_period_start as "currentPeriodStart",
              sub.current_period_end as "currentPeriodEnd",
              sub.trial_ends_at as "trialEndsAt",
              sub.cancel_at_period_end as "cancelAtPeriodEnd",
              p.code as "planCode",
              p.name as "planName",
              p.price_monthly::float as "priceMonthly",
              p.currency
            from subscriptions sub
            left join plans p on p.id = sub.plan_id
            where sub.site_id = s.id
            order by sub.created_at desc
            limit 1
          ) item
        ), '{}'::json) as subscription,
        coalesce((
          select json_agg(row_to_json(item) order by item."createdAt" desc)
          from (
            select
              bi.id,
              bi.amount::float,
              bi.currency,
              bi.status,
              bi.due_date as "dueDate",
              bi.paid_at as "paidAt",
              bi.created_at as "createdAt"
            from billing_invoices bi
            where bi.site_id = s.id
            order by bi.created_at desc
            limit 12
          ) item
        ), '[]'::json) as invoices
      from sites s
      where s.id = $1
    `,
    [resolvedSiteId],
  );
}

async function assertSiteCanWrite(siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const site = await queryOne(
    `
      select
        id,
        status,
        billing_status as "billingStatus",
        trial_ends_at as "trialEndsAt"
      from sites
      where id = $1
    `,
    [resolvedSiteId],
  );
  if (!site) {
    const error = new Error("Không tìm thấy site.");
    error.code = "SITE_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }
  if (site.status !== "active") {
    const error = new Error("Site hiện không hoạt động.");
    error.code = "SITE_INACTIVE";
    error.statusCode = 403;
    throw error;
  }

  const trialExpired =
    site.billingStatus === "trialing" &&
    site.trialEndsAt &&
    new Date(site.trialEndsAt).getTime() < Date.now();
  if (trialExpired || ["past_due", "suspended", "canceled"].includes(site.billingStatus)) {
    const error = new Error("Site đã hết hạn dùng thử hoặc cần thanh toán để tiếp tục ghi dữ liệu.");
    error.code = "BILLING_REQUIRED";
    error.statusCode = 402;
    throw error;
  }

  return site;
}

async function listMaster(table, orderColumn, siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(
    `select id, ${orderColumn} as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     from ${table}
     where site_id = $1 and is_active = true
     order by ${orderColumn}`,
    [resolvedSiteId],
  );
}

async function listReceipts(customerId = null, siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(
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
      where r.site_id = $1 and ($2::uuid is null or c.id = $2)
      group by r.id, c.id, c.name
      order by r.received_date desc, r.created_at desc
      limit 200
    `,
    [resolvedSiteId, customerId],
  );
}

async function listDispatches(customerId = null, siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(
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
      where d.site_id = $1 and ($2::uuid is null or c.id = $2)
      group by d.id, c.id, c.name, v.plate, dr.name
      order by d.dispatch_date desc, d.created_at desc
      limit 200
    `,
    [resolvedSiteId, customerId],
  );
}

async function listUsers(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(`
    select
      u.id,
      u.display_name as name,
      u.phone,
      sm.role,
      sm.is_active as "isActive",
      sm.created_at as "createdAt",
      sm.updated_at as "updatedAt"
    from site_memberships sm
    join users u on u.id = sm.user_id
    where sm.site_id = $1
      and sm.is_active = true
      and u.is_active = true
    order by sm.created_at desc
    limit 200
  `, [resolvedSiteId]);
}

async function masterData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(`
    select
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from customers
          where site_id = $1 and is_active = true
          order by name
        ) item
      ), '[]'::json) as customers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from drivers
          where site_id = $1 and is_active = true
          order by name
        ) item
      ), '[]'::json) as drivers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, plate as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from vehicles
          where site_id = $1 and is_active = true
          order by plate
        ) item
      ), '[]'::json) as vehicles
  `, [resolvedSiteId]);

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
          where r.site_id = $1
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
          where d.site_id = $1
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
      where c.site_id = $1
      group by c.id, c.name, ri.sku
    ),
    dispatches_by_customer_sku as (
      select
        d.customer_id,
        di.sku,
        sum(di.quantity) as dispatched_quantity
      from dispatches d
      join dispatch_items di on di.dispatch_id = d.id
      where d.site_id = $1
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

async function operationsData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(`
    select
      receipt_data.receipts,
      dispatch_data.dispatches,
      ${inventoryJsonSql()} as inventory
    from (${receiptDataSql(false)}) receipt_data
    cross join (${dispatchDataSql(false)}) dispatch_data
  `, [resolvedSiteId]);

  return {
    dispatches: row.dispatches || [],
    inventory: row.inventory || [],
    receipts: row.receipts || [],
  };
}

async function receiptData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(receiptDataSql(), [resolvedSiteId]);
  return {
    inventory: row.inventory || [],
    receipts: row.receipts || [],
  };
}

async function dispatchData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(dispatchDataSql(), [resolvedSiteId]);
  return {
    dispatches: row.dispatches || [],
    inventory: row.inventory || [],
  };
}

async function reportData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(`
    select
      coalesce((
        with last_invoice as (
          select customer_id, max(period_closed_at) as period_closed_at
          from invoice_approvals
          where site_id = $1
          group by customer_id
        ),
        receipts_by_customer_sku as (
          select
            c.id as customer_id,
            c.name as customer,
            ri.sku,
            sum(ri.quantity) as received_quantity,
            min(r.received_date) as first_receipt_date,
            max(r.received_date) as last_receipt_date,
            max(r.created_at) as last_receipt_at
          from customers c
          left join last_invoice li on li.customer_id = c.id
          join receipts r on r.customer_id = c.id
          join receipt_items ri on ri.receipt_id = r.id
          where c.site_id = $1
            and (li.period_closed_at is null or r.created_at > li.period_closed_at)
          group by c.id, c.name, ri.sku
        ),
        dispatches_by_customer_sku as (
          select
            d.customer_id,
            di.sku,
            sum(di.quantity) as dispatched_quantity,
            max(d.dispatch_date) as last_dispatch_date,
            max(d.created_at) as last_dispatch_at
          from dispatches d
          left join last_invoice li on li.customer_id = d.customer_id
          join dispatch_items di on di.dispatch_id = d.id
          where d.site_id = $1
            and (li.period_closed_at is null or d.created_at > li.period_closed_at)
          group by d.customer_id, di.sku
        ),
        inventory as (
          select
            r.customer_id,
            r.customer,
            sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity,
            count(*) as item_count,
            min(r.first_receipt_date) as period_start,
            max(greatest(r.last_receipt_date, coalesce(d.last_dispatch_date, r.last_receipt_date))) as period_end,
            max(greatest(r.last_receipt_at, coalesce(d.last_dispatch_at, r.last_receipt_at))) as period_closed_at
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
            i.item_count::int as "itemCount",
            i.period_start as "periodStart",
            i.period_end as "periodEnd",
            (select li.period_closed_at from last_invoice li where li.customer_id = i.customer_id) as "periodOpenAt",
            i.period_closed_at as "periodClosedAt"
          from inventory i
          left join invoice_approvals ia
            on ia.customer_id = i.customer_id
            and ia.period_closed_at = i.period_closed_at
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
          'approvedByName', item."approvedByName",
          'periodStart', item."periodStart",
          'periodEnd', item."periodEnd",
          'periodClosedAt', item."periodClosedAt"
        ) order by item.date desc, item."createdAt" desc)
        from (
          select
            ia.id,
            ia.approval_date as date,
            ia.period_start as "periodStart",
            ia.period_end as "periodEnd",
            ia.period_closed_at as "periodClosedAt",
            ia.status,
            c.id as "customerId",
            c.name as customer,
            ia.approved_by_name as "approvedByName",
            ia.created_at as "createdAt"
          from invoice_approvals ia
          join customers c on c.id = ia.customer_id
          where ia.site_id = $1
          order by ia.approval_date desc, ia.created_at desc
          limit 500
        ) item
      ), '[]'::json) as "invoiceApprovals"
  `, [resolvedSiteId]);

  return {
    billingReady: row.billingReady || [],
    invoiceApprovals: row.invoiceApprovals || [],
  };
}

async function createNamedMaster({ table, column, value, user, entityType }) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const result = await client.query(
      `
        insert into ${table} (site_id, ${column})
        values ($1, $2)
        on conflict (site_id, ${column}) do update
        set is_active = true, updated_at = now()
        returning *
      `,
      [siteId, value],
    );
    await audit(client, { ...user, siteId }, "create", entityType, result.rows[0].id, {
      [column]: value,
      siteId,
    });
    return result.rows[0];
  });
}

async function updateNamedMaster({ table, column, id, value, user, entityType }) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const result = await client.query(
      `
        update ${table}
        set ${column} = $1, updated_at = now()
        where id = $2 and site_id = $3 and is_active = true
        returning *
      `,
      [value, id, siteId],
    );
    if (!result.rowCount) return null;
    await audit(client, { ...user, siteId }, "update", entityType, id, {
      [column]: value,
      siteId,
    });
    return result.rows[0];
  });
}

async function assertCustomerCanBeDeleted(client, customerId, siteId) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
          and r.site_id = $2
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
          and d.site_id = $2
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
            and ia.site_id = $2
        ) as "hasInvoiceApproval"
      from inventory i
    `,
    [customerId, siteId],
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
    const siteId = await resolveSiteId(user.siteId);
    if (table === "customers") {
      const customer = await client.query(
        "select id from customers where id = $1 and site_id = $2 and is_active = true",
        [id, siteId],
      );
      if (!customer.rowCount) return null;
      await assertCustomerCanBeDeleted(client, id, siteId);
    }

    const result = await client.query(
      `
        update ${table}
        set is_active = false, updated_at = now()
        where id = $1 and site_id = $2 and is_active = true
        returning *
      `,
      [id, siteId],
    );
    if (!result.rowCount) return null;
    await audit(client, { ...user, siteId }, "delete", entityType, id);
    return result.rows[0];
  });
}

async function scopedId(client, { table, id, siteId, label = "Bản ghi" }) {
  if (!id) return null;
  const result = await client.query(
    `select id from ${table} where id = $1 and site_id = $2 and is_active = true`,
    [id, siteId],
  );
  if (!result.rowCount) {
    const error = new Error(`${label} không thuộc site hiện tại hoặc đã bị khóa.`);
    error.statusCode = 404;
    error.code = "SCOPED_RECORD_NOT_FOUND";
    throw error;
  }
  return id;
}

async function ensureCustomer(client, { customerId, customerName, siteId }) {
  if (customerId) {
    return scopedId(client, {
      id: customerId,
      label: "Khách hàng",
      siteId,
      table: "customers",
    });
  }
  const result = await client.query(
    `
      insert into customers (site_id, name)
      values ($1, $2)
      on conflict (site_id, name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, customerName],
  );
  return result.rows[0].id;
}

async function ensureVehicle(client, { vehicleId, plate, siteId }) {
  if (vehicleId) {
    return scopedId(client, {
      id: vehicleId,
      label: "Xe",
      siteId,
      table: "vehicles",
    });
  }
  const result = await client.query(
    `
      insert into vehicles (site_id, plate)
      values ($1, $2)
      on conflict (site_id, plate) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, plate],
  );
  return result.rows[0].id;
}

async function ensureDriver(client, { driverId, driverName, siteId }) {
  if (driverId) {
    return scopedId(client, {
      id: driverId,
      label: "Tài xế",
      siteId,
      table: "drivers",
    });
  }
  const result = await client.query(
    `
      insert into drivers (site_id, name)
      values ($1, $2)
      on conflict (site_id, name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, driverName],
  );
  return result.rows[0].id;
}

async function availableInventory(client, customerId, skus = [], siteId) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, coalesce(max(ri.unit), 'đơn vị') as unit, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
          and r.site_id = $3
          and (coalesce(array_length($2::text[], 1), 0) = 0 or ri.sku = any($2::text[]))
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
          and d.site_id = $3
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
    [customerId, skus, siteId],
  );
  return result.rows;
}

async function createReceipt(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const customerId = await ensureCustomer(client, { ...data, siteId });
    const customerName =
      data.customerName ||
      (await client.query("select name from customers where id = $1 and site_id = $2", [customerId, siteId])).rows[0]?.name ||
      "";
    const receipt = await client.query(
      `
        insert into receipts (site_id, customer_id, received_by_id, received_by_name, received_date)
        values ($1, $2, $3, $4, $5)
        returning id, received_date, received_by_name, created_at
      `,
      [siteId, customerId, user.id, data.receivedByName || user.name, data.date],
    );

    const items = await client.query(
      `
        insert into receipt_items (receipt_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
        returning id, sku, quantity::float as quantity, unit
      `,
      [receipt.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, { ...user, siteId }, "create", "receipt", receipt.rows[0].id, {
      customerId,
      itemCount: data.items.length,
      siteId,
    });
    return {
      id: receipt.rows[0].id,
      createdAt: receipt.rows[0].created_at,
      customer: customerName,
      customerId,
      date: receipt.rows[0].received_date,
      items: items.rows,
      receivedByName: receipt.rows[0].received_by_name,
    };
  });
}

async function createDispatch(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const customerId = await ensureCustomer(client, { ...data, siteId });
    const vehicleId = await ensureVehicle(client, { ...data, siteId });
    const driverId = await ensureDriver(client, { ...data, siteId });
    const customerName =
      data.customerName ||
      (await client.query("select name from customers where id = $1 and site_id = $2", [customerId, siteId])).rows[0]?.name ||
      "";
    const plate =
      data.plate ||
      (await client.query("select plate from vehicles where id = $1 and site_id = $2", [vehicleId, siteId])).rows[0]?.plate ||
      "";
    const driverName =
      data.driverName ||
      (await client.query("select name from drivers where id = $1 and site_id = $2", [driverId, siteId])).rows[0]?.name ||
      "";
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`dispatch:${siteId}:${customerId}`]);
    const requestedSkus = Array.from(new Set(data.items.map((item) => item.sku)));
    const inventory = await availableInventory(client, customerId, requestedSkus, siteId);
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
          site_id, customer_id, vehicle_id, driver_id, warehouse_user_id, warehouse_name, dispatch_date
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, dispatch_date, warehouse_name, created_at
      `,
      [
        siteId,
        customerId,
        vehicleId,
        driverId,
        user.id,
        data.warehouseName || user.name,
        data.date,
      ],
    );

    const items = await client.query(
      `
        insert into dispatch_items (dispatch_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
        returning id, sku, quantity::float as quantity, unit
      `,
      [dispatch.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, { ...user, siteId }, "create", "dispatch", dispatch.rows[0].id, {
      customerId,
      vehicleId,
      driverId,
      itemCount: data.items.length,
      siteId,
    });
    return {
      id: dispatch.rows[0].id,
      createdAt: dispatch.rows[0].created_at,
      customer: customerName,
      customerId,
      date: dispatch.rows[0].dispatch_date,
      driver: driverName,
      driverId,
      items: items.rows,
      plate,
      vehicleId,
      warehouse: dispatch.rows[0].warehouse_name,
    };
  });
}

async function inventoryRows(customerId = null, siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
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
        where c.site_id = $1 and ($2::uuid is null or c.id = $2)
        group by c.id, c.name, ri.sku
      ),
      dispatches_by_customer_sku as (
        select
          d.customer_id,
          di.sku,
          sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.site_id = $1 and ($2::uuid is null or d.customer_id = $2)
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
    [resolvedSiteId, customerId],
  );
}

async function billingReadyCustomers(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(`
    with last_invoice as (
      select customer_id, max(period_closed_at) as period_closed_at
      from invoice_approvals
      where site_id = $1
      group by customer_id
    ),
    receipts_by_customer_sku as (
      select
        c.id as customer_id,
        c.name as customer,
        ri.sku,
        sum(ri.quantity) as received_quantity,
        min(r.received_date) as first_receipt_date,
        max(r.received_date) as last_receipt_date,
        max(r.created_at) as last_receipt_at
      from customers c
      left join last_invoice li on li.customer_id = c.id
      join receipts r on r.customer_id = c.id
      join receipt_items ri on ri.receipt_id = r.id
      where c.site_id = $1
        and (li.period_closed_at is null or r.created_at > li.period_closed_at)
      group by c.id, c.name, ri.sku
    ),
    dispatches_by_customer_sku as (
      select
        d.customer_id,
        di.sku,
        sum(di.quantity) as dispatched_quantity,
        max(d.dispatch_date) as last_dispatch_date,
        max(d.created_at) as last_dispatch_at
      from dispatches d
      left join last_invoice li on li.customer_id = d.customer_id
      join dispatch_items di on di.dispatch_id = d.id
      where d.site_id = $1
        and (li.period_closed_at is null or d.created_at > li.period_closed_at)
      group by d.customer_id, di.sku
    ),
    inventory as (
      select
        r.customer_id,
        r.customer,
        sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity,
        count(*) as item_count,
        min(r.first_receipt_date) as period_start,
        max(greatest(r.last_receipt_date, coalesce(d.last_dispatch_date, r.last_receipt_date))) as period_end,
        max(greatest(r.last_receipt_at, coalesce(d.last_dispatch_at, r.last_receipt_at))) as period_closed_at
      from receipts_by_customer_sku r
      left join dispatches_by_customer_sku d
        on d.customer_id = r.customer_id and d.sku = r.sku
      group by r.customer_id, r.customer
    )
    select
      i.customer_id as "customerId",
      i.customer,
      i.item_count::int as "itemCount",
      i.period_start as "periodStart",
      i.period_end as "periodEnd",
      (select li.period_closed_at from last_invoice li where li.customer_id = i.customer_id) as "periodOpenAt",
      i.period_closed_at as "periodClosedAt"
    from inventory i
    left join invoice_approvals ia
      on ia.customer_id = i.customer_id
      and ia.period_closed_at = i.period_closed_at
    where i.remaining_quantity = 0 and ia.id is null
    order by i.customer
  `, [resolvedSiteId]);
}

async function createInvoiceApproval(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    await scopedId(client, {
      id: data.customerId,
      label: "Khách hàng",
      siteId,
      table: "customers",
    });
    const approvalDate = data.approvalDate || new Date().toISOString().slice(0, 10);
    const periodStart = data.periodStart || approvalDate;
    const periodEnd = data.periodEnd || approvalDate;
    const periodClosedAt = data.periodClosedAt || new Date().toISOString();
    const approval = await client.query(
      `
        insert into invoice_approvals (
          site_id,
          customer_id,
          approved_by_id,
          approved_by_name,
          approval_date,
          period_start,
          period_end,
          period_closed_at,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (site_id, customer_id, period_closed_at) do update
        set approved_by_id = excluded.approved_by_id,
            approved_by_name = excluded.approved_by_name,
            approval_date = excluded.approval_date,
            period_start = excluded.period_start,
            period_end = excluded.period_end,
            status = excluded.status,
            updated_at = now()
        returning *
      `,
      [
        siteId,
        data.customerId,
        user.id,
        data.approvedByName || user.name,
        approvalDate,
        periodStart,
        periodEnd,
        periodClosedAt,
        data.status,
      ],
    );
    await audit(client, { ...user, siteId }, "create", "invoice_approval", approval.rows[0].id, {
      customerId: data.customerId,
      periodClosedAt,
      periodEnd,
      periodStart,
      siteId,
    });
    return approval.rows[0];
  });
}

async function deactivateSiteUser(userId, siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return transaction(async (client) => {
    const membership = await client.query(
      `
        update site_memberships
        set is_active = false, updated_at = now()
        where site_id = $1 and user_id = $2 and is_active = true
        returning id
      `,
      [resolvedSiteId, userId],
    );
    if (!membership.rowCount) return null;

    const activeMemberships = await client.query(
      "select 1 from site_memberships where user_id = $1 and is_active = true limit 1",
      [userId],
    );
    if (!activeMemberships.rowCount) {
      await client.query(
        "update users set is_active = false, updated_at = now() where id = $1",
        [userId],
      );
    }
    return membership.rows[0];
  });
}

module.exports = {
  assertSiteCanWrite,
  billingReadyCustomers,
  billingSummary,
  createDispatch,
  createInvoiceApproval,
  createNamedMaster,
  createReceipt,
  deactivateSiteUser,
  defaultSite,
  dispatchData,
  inventoryRows,
  listDispatches,
  listMaster,
  listReceipts,
  listSites,
  listUsers,
  masterData,
  operationsData,
  query,
  queryOne,
  receiptData,
  reportData,
  resolveSiteId,
  softDeleteMaster,
  updateNamedMaster,
};
