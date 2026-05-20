require("dotenv").config();

const crypto = require("node:crypto");
const express = require("express");
const { ZodError } = require("zod");
const { requestContext, requireRole } = require("./auth");
const { pageAccess, roles } = require("./roles");
const repo = require("./repository");
const {
  dispatchSchema,
  invoiceApprovalSchema,
  namedMasterSchema,
  receiptSchema,
  settingSchema,
  userSchema,
  userUpdateSchema,
  vehicleSchema,
} = require("./validators");

const app = express();
const readCache = new Map();
const cacheTtl = {
  app: 10_000,
  master: 5 * 60_000,
  operations: 15_000,
  receipt: 15_000,
  dispatch: 15_000,
  report: 30_000,
};

function cachedRead(key, loader, ttlMs = 15_000) {
  const now = Date.now();
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = Promise.resolve()
    .then(loader)
    .catch((error) => {
      readCache.delete(key);
      throw error;
    });
  readCache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

function invalidateReadCache() {
  readCache.clear();
}

async function writeThrough(work) {
  const result = await work();
  invalidateReadCache();
  return result;
}

app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localDevOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const allowedOrigins = [...configuredOrigins, ...localDevOrigins];
  const requestOrigin = request.header("origin");
  const responseOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : configuredOrigins[0] || "*";

  response.setHeader("Access-Control-Allow-Origin", responseOrigin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-user-name, x-user-role");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});
app.use(requestContext);

app.get("/api/health", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ ok: true });
});

app.get("/api/ready", async (_request, response) => {
  await repo.query("select 1 as ok");
  response.setHeader("Cache-Control", "no-store");
  response.json({ ok: true });
});

app.get("/api/access", (_request, response) => {
  response.json({ roles, pageAccess });
});

function publicUser(row) {
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    id: row.id,
    isActive: row.isActive,
    name: row.name,
    phone: row.phone,
    role: row.role,
    updatedAt: row.updatedAt,
  };
}

function hashPassword(password = "") {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function userRows() {
  return repo.query(`
    select
      id,
      display_name as name,
      phone,
      role,
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from users
    where is_active = true
    order by created_at desc
    limit 200
  `);
}

app.get("/api/users", requireRole("admin"), async (_request, response) => {
  response.json(await userRows());
});

app.post("/api/users", requireRole("admin"), async (request, response) => {
  const body = userSchema.parse(request.body);
  const item = await repo.queryOne(
    `
      insert into users (display_name, phone, password_hash, role)
      values ($1, $2, $3, $4)
      on conflict (phone) do update
      set display_name = excluded.display_name,
          password_hash = excluded.password_hash,
          role = excluded.role,
          is_active = true,
          updated_at = now()
      returning
        id,
        display_name as name,
        phone,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [body.name, body.phone, body.password ? hashPassword(body.password) : null, body.role],
  );
  response.status(201).json(publicUser(item));
});

app.patch("/api/users/:id", requireRole("admin"), async (request, response) => {
  const body = userUpdateSchema.parse(request.body);
  const current = await repo.queryOne(
    "select id, display_name, phone, password_hash, role from users where id = $1 and is_active = true",
    [request.params.id],
  );
  if (!current) {
    response.status(404).json({ error: "NOT_FOUND" });
    return;
  }

  const item = await repo.queryOne(
    `
      update users
      set display_name = $1,
          phone = $2,
          password_hash = $3,
          role = $4,
          updated_at = now()
      where id = $5 and is_active = true
      returning
        id,
        display_name as name,
        phone,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      body.name || current.display_name,
      body.phone || current.phone,
      body.password ? hashPassword(body.password) : current.password_hash,
      body.role || current.role,
      request.params.id,
    ],
  );
  response.json(publicUser(item));
});

app.delete("/api/users/:id", requireRole("admin"), async (request, response) => {
  const item = await repo.queryOne(
    `
      update users
      set is_active = false, updated_at = now()
      where id = $1 and is_active = true
      returning id
    `,
    [request.params.id],
  );
  if (!item) {
    response.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  response.status(204).end();
});

app.get("/api/settings", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(
    await repo.query(`
      select key, value, updated_at as "updatedAt"
      from app_settings
      order by key
    `),
  );
});

app.put("/api/settings/:key", requireRole("admin"), async (request, response) => {
  const body = settingSchema.parse({
    key: request.params.key,
    value: request.body.value,
  });
  const item = await repo.queryOne(
    `
      insert into app_settings (key, value)
      values ($1, $2::jsonb)
      on conflict (key) do update
      set value = excluded.value, updated_at = now()
      returning key, value, updated_at as "updatedAt"
    `,
    [body.key, JSON.stringify(body.value)],
  );
  response.json(item);
});

function registerMasterRoutes({ path, table, column, schema, entityType }) {
  app.get(`/api/${path}`, requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
    response.json(await repo.listMaster(table, column));
  });

  app.post(`/api/${path}`, requireRole("warehouse"), async (request, response) => {
    const body = schema.parse(request.body);
    const value = body[column] || body.name;
    const item = await repo.createNamedMaster({
      table,
      column,
      value,
      user: request.user,
      entityType,
    });
    invalidateReadCache();
    response.status(201).json(item);
  });

  app.patch(`/api/${path}/:id`, requireRole("warehouse"), async (request, response) => {
    const body = schema.parse(request.body);
    const value = body[column] || body.name;
    const item = await repo.updateNamedMaster({
      table,
      column,
      id: request.params.id,
      value,
      user: request.user,
      entityType,
    });
    if (!item) {
      response.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    invalidateReadCache();
    response.json(item);
  });

  app.delete(`/api/${path}/:id`, requireRole("warehouse"), async (request, response) => {
    const item = await repo.softDeleteMaster({
      table,
      id: request.params.id,
      user: request.user,
      entityType,
    });
    if (!item) {
      response.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    invalidateReadCache();
    response.status(204).end();
  });
}

registerMasterRoutes({
  path: "customers",
  table: "customers",
  column: "name",
  schema: namedMasterSchema,
  entityType: "customer",
});
registerMasterRoutes({
  path: "vehicles",
  table: "vehicles",
  column: "plate",
  schema: vehicleSchema,
  entityType: "vehicle",
});
registerMasterRoutes({
  path: "drivers",
  table: "drivers",
  column: "name",
  schema: namedMasterSchema,
  entityType: "driver",
});

app.get("/api/receipts", requireRole("driver", "warehouse"), async (request, response) => {
  const rows = await repo.query(
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
    [request.query.customerId || null],
  );
  response.json(rows);
});

app.post("/api/receipts", requireRole("driver", "warehouse"), async (request, response) => {
  const body = receiptSchema.parse(request.body);
  const receipt = await repo.createReceipt(body, request.user);
  invalidateReadCache();
  response.status(201).json(receipt);
});

app.get("/api/dispatches", requireRole("driver", "warehouse", "accountant"), async (request, response) => {
  const rows = await repo.query(
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
    [request.query.customerId || null],
  );
  response.json(rows);
});

app.post("/api/dispatches", requireRole("driver", "warehouse"), async (request, response) => {
  const body = dispatchSchema.parse(request.body);
  const dispatch = await repo.createDispatch(body, request.user);
  invalidateReadCache();
  response.status(201).json(dispatch);
});

app.get("/api/inventory", requireRole("driver", "warehouse", "accountant"), async (request, response) => {
  const customerId = request.query.customerId || null;
  response.json(
    await cachedRead(
      `inventory:${customerId || "all"}`,
      () => repo.inventoryRows(customerId),
      cacheTtl.operations,
    ),
  );
});

function receiptRows() {
  return repo.query(`
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
        group by r.id, c.id, c.name
        order by r.received_date desc, r.created_at desc
        limit 500
      `);
}

function dispatchRows() {
  return repo.query(`
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
      `);
}

function invoiceApprovalRows() {
  return repo.query(`
        select
          ia.id,
          ia.approval_date as date,
          ia.status,
          c.id as "customerId",
          c.name as customer,
          ia.approved_by_name as "approvedByName"
        from invoice_approvals ia
        join customers c on c.id = ia.customer_id
        order by ia.approval_date desc, ia.created_at desc
        limit 500
      `);
}

async function loadMasterData() {
  return cachedRead("master", () => repo.masterData(), cacheTtl.master);
}

async function loadOperationsData() {
  return cachedRead("operations", () => repo.operationsData(), cacheTtl.operations);
}

async function loadReceiptData() {
  return cachedRead("receipt", () => repo.receiptData(), cacheTtl.receipt);
}

async function loadDispatchData() {
  return cachedRead("dispatch", () => repo.dispatchData(), cacheTtl.dispatch);
}

async function loadReportData() {
  return cachedRead("report", () => repo.reportData(), cacheTtl.report);
}

async function loadAppData() {
  return cachedRead("app", async () => {
    const masterData = await loadMasterData();
    const operationsData = await loadOperationsData();
    const reportData = await loadReportData();

    return {
      ...masterData,
      ...operationsData,
      ...reportData,
    };
  }, cacheTtl.app);
}

app.get("/api/app-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadAppData());
});

app.get("/api/master-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadMasterData());
});

app.get("/api/operations-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadOperationsData());
});

app.get("/api/receipt-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadReceiptData());
});

app.get("/api/dispatch-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadDispatchData());
});

app.get("/api/report-data", requireRole("accountant"), async (_request, response) => {
  response.json(await loadReportData());
});

app.get("/api/jsonp", async (request, response) => {
  const callback = request.query.callback || "callback";
  const token = request.query.token || "";
  const payload = request.query.body ? JSON.parse(request.query.body) : {};
  const user = {
    id: null,
    name: decodeURIComponent(request.query.name || "Người dùng mẫu"),
    role: request.query.role || "warehouse",
  };

  try {
    const data = await handleJsonpOperation({
      method: request.query.method || "GET",
      path: request.query.path || "",
      payload,
      user,
    });
    response.type("text/javascript").send(jsonpScript({ callback, token, payload: { ok: true, data } }));
  } catch (error) {
    response
      .type("text/javascript")
      .send(jsonpScript({ callback, token, payload: {
        ok: false,
        status: error.statusCode || 500,
        error: { message: error.message, code: error.code },
      } }));
  }
});

function jsonpScript({ callback, token, payload }) {
  const serialized = JSON.stringify(payload);
  if (token) {
    return `var e=document.createEvent("CustomEvent");e.initCustomEvent("fet-api-response",false,false,{token:${JSON.stringify(token)},payload:${serialized}});document.dispatchEvent(e);`;
  }
  return `${callback}(${serialized});`;
}

async function handleJsonpOperation({ method, path, payload, user }) {
  if (method === "GET" && path === "/app-data") return loadAppData();
  if (method === "GET" && path === "/master-data") return loadMasterData();
  if (method === "GET" && path === "/operations-data") return loadOperationsData();
  if (method === "GET" && path === "/receipt-data") return loadReceiptData();
  if (method === "GET" && path === "/dispatch-data") return loadDispatchData();
  if (method === "GET" && path === "/report-data") return loadReportData();
  if (method === "GET" && path === "/users") return userRows();
  if (method === "GET" && path === "/settings") {
    return repo.query(`
      select key, value, updated_at as "updatedAt"
      from app_settings
      order by key
    `);
  }
  if (method === "POST" && path === "/receipts") {
    return writeThrough(() => repo.createReceipt(receiptSchema.parse(payload), user));
  }
  if (method === "POST" && path === "/dispatches") {
    return writeThrough(() => repo.createDispatch(dispatchSchema.parse(payload), user));
  }
  if (method === "POST" && path === "/invoice-approvals") {
    return writeThrough(() => repo.createInvoiceApproval(invoiceApprovalSchema.parse(payload), user));
  }
  if (method === "POST" && path === "/users") {
    const body = userSchema.parse(payload);
    const item = await writeThrough(() => repo.queryOne(
      `
        insert into users (display_name, phone, password_hash, role)
        values ($1, $2, $3, $4)
        on conflict (phone) do update
        set display_name = excluded.display_name,
            password_hash = excluded.password_hash,
            role = excluded.role,
            is_active = true,
            updated_at = now()
        returning
          id,
          display_name as name,
          phone,
          role,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [body.name, body.phone, body.password ? hashPassword(body.password) : null, body.role],
    ));
    return publicUser(item);
  }
  if (method === "PATCH" && path.startsWith("/users/")) {
    const body = userUpdateSchema.parse(payload);
    const id = path.split("/")[2];
    const current = await repo.queryOne(
      "select id, display_name, phone, password_hash, role from users where id = $1 and is_active = true",
      [id],
    );
    if (!current) return null;
    return publicUser(await writeThrough(() => repo.queryOne(
      `
        update users
        set display_name = $1,
            phone = $2,
            password_hash = $3,
            role = $4,
            updated_at = now()
        where id = $5 and is_active = true
        returning
          id,
          display_name as name,
          phone,
          role,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        body.name || current.display_name,
        body.phone || current.phone,
        body.password ? hashPassword(body.password) : current.password_hash,
        body.role || current.role,
        id,
      ],
    )));
  }
  if (method === "DELETE" && path.startsWith("/users/")) {
    return writeThrough(() => repo.queryOne(
      `
        update users
        set is_active = false, updated_at = now()
        where id = $1 and is_active = true
        returning id
      `,
      [path.split("/")[2]],
    ));
  }
  if ((method === "PUT" || method === "POST") && path.startsWith("/settings/")) {
    const body = settingSchema.parse({
      key: path.split("/")[2],
      value: payload.value,
    });
    return writeThrough(() => repo.queryOne(
      `
        insert into app_settings (key, value)
        values ($1, $2::jsonb)
        on conflict (key) do update
        set value = excluded.value, updated_at = now()
        returning key, value, updated_at as "updatedAt"
      `,
      [body.key, JSON.stringify(body.value)],
    ));
  }

  const masterMatch = path.match(/^\/(customers|vehicles|drivers)(?:\/(.+))?$/);
  if (masterMatch) {
    const config = {
      customers: { table: "customers", column: "name", entityType: "customer", schema: namedMasterSchema },
      drivers: { table: "drivers", column: "name", entityType: "driver", schema: namedMasterSchema },
      vehicles: { table: "vehicles", column: "plate", entityType: "vehicle", schema: vehicleSchema },
    }[masterMatch[1]];
    if (method === "POST") {
      const body = config.schema.parse(payload);
      return writeThrough(() => repo.createNamedMaster({
        table: config.table,
        column: config.column,
        value: body[config.column] || body.name,
        user,
        entityType: config.entityType,
      }));
    }
    if (method === "PATCH") {
      const body = config.schema.parse(payload);
      return writeThrough(() => repo.updateNamedMaster({
        table: config.table,
        column: config.column,
        id: masterMatch[2],
        value: body[config.column] || body.name,
        user,
        entityType: config.entityType,
      }));
    }
    if (method === "DELETE") {
      return writeThrough(() => repo.softDeleteMaster({
        table: config.table,
        id: masterMatch[2],
        user,
        entityType: config.entityType,
      }));
    }
  }

  const error = new Error("Unsupported JSONP operation.");
  error.statusCode = 404;
  throw error;
}

app.get("/api/reports/billing-ready", requireRole("accountant"), async (_request, response) => {
  response.json(
    await cachedRead(
      "billing-ready",
      () => repo.billingReadyCustomers(),
      cacheTtl.report,
    ),
  );
});

app.get("/api/invoice-approvals", requireRole("accountant"), async (_request, response) => {
  response.json(
    await cachedRead("invoice-approvals", () => repo.query(`
      select
        ia.id,
        ia.approval_date as date,
        ia.status,
        c.id as "customerId",
        c.name as customer,
        ia.approved_by_name as "approvedByName"
      from invoice_approvals ia
      join customers c on c.id = ia.customer_id
      order by ia.approval_date desc, ia.created_at desc
      limit 200
    `), cacheTtl.report),
  );
});

app.post("/api/invoice-approvals", requireRole("accountant"), async (request, response) => {
  const body = invoiceApprovalSchema.parse(request.body);
  const approval = await repo.createInvoiceApproval(body, request.user);
  invalidateReadCache();
  response.status(201).json(approval);
});

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      issues: error.issues,
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    error: error.code || "INTERNAL_ERROR",
    message: error.message || "Có lỗi xảy ra.",
  });
});

module.exports = app;
