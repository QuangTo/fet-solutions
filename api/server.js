require("dotenv").config();

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
  vehicleSchema,
} = require("./validators");

const app = express();
const port = Number(process.env.API_PORT || process.env.PORT || 4175);

app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-user-name, x-user-role");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});
app.use(requestContext);

app.get("/api/health", async (_request, response) => {
  await repo.query("select 1 as ok");
  response.json({ ok: true });
});

app.get("/api/access", (_request, response) => {
  response.json({ roles, pageAccess });
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
  response.status(201).json(dispatch);
});

app.get("/api/inventory", requireRole("driver", "warehouse", "accountant"), async (request, response) => {
  response.json(await repo.inventoryRows(request.query.customerId || null));
});

async function loadAppData() {
  const [customers, vehicles, drivers, receipts, dispatches, inventory, billingReady, invoiceApprovals] =
    await Promise.all([
      repo.listMaster("customers", "name"),
      repo.listMaster("vehicles", "plate"),
      repo.listMaster("drivers", "name"),
      repo.query(`
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
      `),
      repo.query(`
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
      `),
      repo.inventoryRows(),
      repo.billingReadyCustomers(),
      repo.query(`
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
      `),
    ]);

  return {
    billingReady,
    customers,
    dispatches,
    drivers,
    inventory,
    invoiceApprovals,
    receipts,
    vehicles,
  };
}

app.get("/api/app-data", requireRole("driver", "warehouse", "accountant"), async (_request, response) => {
  response.json(await loadAppData());
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
  if (method === "POST" && path === "/receipts") {
    return repo.createReceipt(receiptSchema.parse(payload), user);
  }
  if (method === "POST" && path === "/dispatches") {
    return repo.createDispatch(dispatchSchema.parse(payload), user);
  }
  if (method === "POST" && path === "/invoice-approvals") {
    return repo.createInvoiceApproval(invoiceApprovalSchema.parse(payload), user);
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
      return repo.createNamedMaster({
        table: config.table,
        column: config.column,
        value: body[config.column] || body.name,
        user,
        entityType: config.entityType,
      });
    }
    if (method === "PATCH") {
      const body = config.schema.parse(payload);
      return repo.updateNamedMaster({
        table: config.table,
        column: config.column,
        id: masterMatch[2],
        value: body[config.column] || body.name,
        user,
        entityType: config.entityType,
      });
    }
    if (method === "DELETE") {
      return repo.softDeleteMaster({
        table: config.table,
        id: masterMatch[2],
        user,
        entityType: config.entityType,
      });
    }
  }

  const error = new Error("Unsupported JSONP operation.");
  error.statusCode = 404;
  throw error;
}

app.get("/api/reports/billing-ready", requireRole("accountant"), async (_request, response) => {
  response.json(await repo.billingReadyCustomers());
});

app.get("/api/invoice-approvals", requireRole("accountant"), async (_request, response) => {
  response.json(
    await repo.query(`
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
    `),
  );
});

app.post("/api/invoice-approvals", requireRole("accountant"), async (request, response) => {
  const body = invoiceApprovalSchema.parse(request.body);
  const approval = await repo.createInvoiceApproval(body, request.user);
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

app.listen(port, "127.0.0.1", () => {
  console.log(`FET API running at http://127.0.0.1:${port}`);
});
