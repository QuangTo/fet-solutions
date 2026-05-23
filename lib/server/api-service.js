const repo = require("./repository");
const { hashPassword, verifyPassword } = require("./passwords");
const { normalizeRole, pageAccess, roles } = require("./roles");
const {
  dispatchSchema,
  invoiceApprovalSchema,
  loginSchema,
  namedMasterSchema,
  passwordChangeSchema,
  receiptSchema,
  settingSchema,
  userSchema,
  userUpdateSchema,
  vehicleSchema,
} = require("./validators");

const masterConfigs = {
  customers: {
    column: "name",
    entityType: "customer",
    schema: namedMasterSchema,
    table: "customers",
  },
  drivers: {
    column: "name",
    entityType: "driver",
    schema: namedMasterSchema,
    table: "drivers",
  },
  vehicles: {
    column: "plate",
    entityType: "vehicle",
    schema: vehicleSchema,
    table: "vehicles",
  },
};

function json(data, status = 200) {
  return Response.json(data, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function noContent() {
  return new Response(null, {
    headers: { "Cache-Control": "no-store" },
    status: 204,
  });
}

function normalizePhone(phone = "") {
  return phone.toString().trim().replace(/\s+/g, "");
}

function publicUser(row) {
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    id: row.id,
    isActive: row.isActive,
    name: row.name,
    phone: row.phone,
    role: normalizeRole(row.role),
    updatedAt: row.updatedAt,
  };
}

async function primarySiteForUser(userId) {
  return (
    (userId
      ? await repo.queryOne(
          `
            select s.id, s.name, sm.role
            from site_memberships sm
            join sites s on s.id = sm.site_id
            where sm.user_id = $1 and sm.is_active = true and s.status = 'active'
            order by sm.created_at
            limit 1
          `,
          [userId],
        )
      : null) || (await repo.defaultSite())
  );
}

async function publicSessionUser(row) {
  const user = publicUser(row);
  if (!user) return null;
  const site = await primarySiteForUser(user.id);
  return {
    ...user,
    role: normalizeRole(site?.role || user.role),
    siteId: site?.id || null,
    siteName: site?.name || "",
  };
}

function userFromRequest(request) {
  const url = new URL(request.url);
  return {
    id: request.headers.get("x-user-id") || null,
    name: safeDecodeURIComponent(
      request.headers.get("x-user-name") || "Người dùng API",
    ),
    role: normalizeRole(request.headers.get("x-user-role") || "driver"),
    siteId: request.headers.get("x-site-id") || url.searchParams.get("siteId"),
  };
}

function requireRole(user, ...allowedRoles) {
  if (user.role === "admin" || allowedRoles.includes(user.role)) return;
  const error = new Error("Vai trò hiện tại không có quyền thực hiện thao tác này.");
  error.statusCode = 403;
  error.code = "FORBIDDEN";
  throw error;
}

function requireAuthenticatedUser(user) {
  if (user.id) return;
  const error = new Error("Cần đăng nhập để xem dữ liệu site.");
  error.statusCode = 401;
  error.code = "AUTH_REQUIRED";
  throw error;
}

async function bodyJson(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function valueFromBody(config, body) {
  return body[config.column] || body.name;
}

async function syncDriverUser(name, role, siteId) {
  if (normalizeRole(role) !== "driver") return;
  const resolvedSiteId = await repo.resolveSiteId(siteId);
  await repo.queryOne(
    `
      insert into drivers (site_id, name)
      values ($1, $2)
      on conflict (site_id, name) do update
      set is_active = true,
          updated_at = now()
      returning id
    `,
    [resolvedSiteId, name],
  );
}

async function upsertSiteMembership(userId, role, siteId) {
  const resolvedSiteId = await repo.resolveSiteId(siteId);
  await repo.queryOne(
    `
      insert into site_memberships (site_id, user_id, role)
      values ($1, $2, $3)
      on conflict (site_id, user_id) do update
      set role = excluded.role,
          is_active = true,
          updated_at = now()
      returning id
    `,
    [resolvedSiteId, userId, normalizeRole(role)],
  );
}

async function createUser(payload) {
  const body = userSchema.parse(payload);
  const phone = normalizePhone(body.phone);
  const password = body.password || phone;
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
    [body.name, phone, hashPassword(password), body.role],
  );
  await upsertSiteMembership(item.id, item.role, payload.siteId);
  await syncDriverUser(item.name, item.role, payload.siteId);
  return publicSessionUser(item);
}

async function login(payload) {
  const body = loginSchema.parse(payload);
  const user = await repo.queryOne(
    `
      select
        id,
        display_name as name,
        phone,
        password_hash as "passwordHash",
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      where phone = $1 and is_active = true
      limit 1
    `,
    [normalizePhone(body.phone)],
  );

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    const error = new Error("Số điện thoại hoặc mật khẩu không đúng.");
    error.statusCode = 401;
    error.code = "INVALID_LOGIN";
    throw error;
  }

  return publicSessionUser(user);
}

async function updateUser(id, payload) {
  const body = userUpdateSchema.parse(payload);
  const current = await repo.queryOne(
    "select id, display_name, phone, password_hash, role from users where id = $1 and is_active = true",
    [id],
  );
  if (!current) return null;

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
      body.phone ? normalizePhone(body.phone) : current.phone,
      body.password ? hashPassword(body.password) : current.password_hash,
      body.role || current.role,
      id,
    ],
  );
  await upsertSiteMembership(item.id, item.role, payload.siteId);
  await syncDriverUser(item.name, item.role, payload.siteId);
  return publicSessionUser(item);
}

async function changePassword(userId, payload) {
  const body = passwordChangeSchema.parse(payload);
  const current = await repo.queryOne(
    `
      select
        id,
        display_name as name,
        phone,
        password_hash as "passwordHash",
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      where id = $1 and is_active = true
    `,
    [userId],
  );
  if (!current) return null;

  if (!verifyPassword(body.currentPassword, current.passwordHash)) {
    const error = new Error("Mật khẩu hiện tại không đúng.");
    error.statusCode = 401;
    error.code = "INVALID_CURRENT_PASSWORD";
    throw error;
  }

  const item = await repo.queryOne(
    `
      update users
      set password_hash = $1,
          updated_at = now()
      where id = $2 and is_active = true
      returning
        id,
        display_name as name,
        phone,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [hashPassword(body.newPassword), userId],
  );

  return publicSessionUser(item);
}

function notFound() {
  const error = new Error("Không tìm thấy API endpoint.");
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  throw error;
}

async function handleOperation({ method, payload, request, segments, user }) {
  const path = `/${segments.join("/")}`;
  const url = new URL(request.url);

  if (method === "GET" && path === "/health") return json({ ok: true });
  if (method === "GET" && path === "/ready") {
    await repo.query("select 1 as ok");
    return json({ ok: true });
  }
  if (method === "GET" && path === "/access") return json({ pageAccess, roles });
  if (method === "POST" && path === "/users/login") return json(await login(payload));
  if (method === "PATCH" && path === "/users/me/password") {
    if (!user.id) {
      const error = new Error("Cần đăng nhập để đổi mật khẩu.");
      error.statusCode = 401;
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    const item = await changePassword(user.id, payload);
    return item ? json(item) : json({ error: "NOT_FOUND" }, 404);
  }

  requireAuthenticatedUser(user);

  if (method === "GET" && path === "/sites") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.listSites(user.role === "admin" ? null : user.id));
  }
  if (method === "GET" && path === "/billing") {
    requireRole(user, "admin", "accountant");
    return json(await repo.billingSummary(user.siteId));
  }
  if (segments[0] === "sites" && segments[1] && method === "GET" && segments[2] === "billing") {
    requireRole(user, "admin", "accountant");
    if (user.role !== "admin" && segments[1] !== user.siteId) {
      const error = new Error("Không có quyền xem billing của site khác.");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
    return json(await repo.billingSummary(segments[1]));
  }

  if (method === "GET" && path === "/master-data") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.masterData(user.siteId));
  }
  if (method === "GET" && path === "/operations-data") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.operationsData(user.siteId));
  }
  if (method === "GET" && path === "/receipt-data") {
    requireRole(user, "driver", "warehouse");
    return json(await repo.receiptData(user.siteId));
  }
  if (method === "GET" && path === "/dispatch-data") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.dispatchData(user.siteId));
  }
  if (method === "GET" && path === "/report-data") {
    requireRole(user, "accountant");
    return json(await repo.reportData(user.siteId));
  }
  if (method === "GET" && path === "/app-data") {
    requireRole(user, "driver", "warehouse", "accountant");
    const [master, operations, report] = await Promise.all([
      repo.masterData(user.siteId),
      repo.operationsData(user.siteId),
      user.role === "admin" || user.role === "accountant"
        ? repo.reportData(user.siteId)
        : Promise.resolve({ billingReady: [], invoiceApprovals: [] }),
    ]);
    return json({ ...master, ...operations, ...report });
  }

  if (method === "GET" && path === "/receipts") {
    requireRole(user, "driver", "warehouse");
    return json(await repo.listReceipts(url.searchParams.get("customerId"), user.siteId));
  }
  if (method === "POST" && path === "/receipts") {
    requireRole(user, "driver", "warehouse");
    await repo.assertSiteCanWrite(user.siteId);
    return json(await repo.createReceipt(receiptSchema.parse(payload), user), 201);
  }
  if (method === "GET" && path === "/dispatches") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.listDispatches(url.searchParams.get("customerId"), user.siteId));
  }
  if (method === "POST" && path === "/dispatches") {
    requireRole(user, "driver", "warehouse");
    await repo.assertSiteCanWrite(user.siteId);
    return json(await repo.createDispatch(dispatchSchema.parse(payload), user), 201);
  }
  if (method === "GET" && path === "/inventory") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.inventoryRows(url.searchParams.get("customerId"), user.siteId));
  }
  if (method === "GET" && path === "/reports/billing-ready") {
    requireRole(user, "accountant");
    return json(await repo.billingReadyCustomers(user.siteId));
  }
  if (method === "GET" && path === "/invoice-approvals") {
    requireRole(user, "accountant");
    const data = await repo.reportData(user.siteId);
    return json(data.invoiceApprovals);
  }
  if (method === "POST" && path === "/invoice-approvals") {
    requireRole(user, "accountant");
    await repo.assertSiteCanWrite(user.siteId);
    return json(
      await repo.createInvoiceApproval(invoiceApprovalSchema.parse(payload), user),
      201,
    );
  }

  if (method === "GET" && path === "/users") {
    requireRole(user, "admin");
    return json(await repo.listUsers(user.siteId));
  }
  if (method === "POST" && path === "/users") {
    requireRole(user, "admin");
    await repo.assertSiteCanWrite(user.siteId);
    return json(await createUser({ ...payload, siteId: user.siteId }), 201);
  }
  if (segments[0] === "users" && segments[1] && method === "PATCH") {
    requireRole(user, "admin");
    await repo.assertSiteCanWrite(user.siteId);
    const item = await updateUser(segments[1], { ...payload, siteId: user.siteId });
    return item ? json(item) : json({ error: "NOT_FOUND" }, 404);
  }
  if (segments[0] === "users" && segments[1] && method === "DELETE") {
    requireRole(user, "admin");
    await repo.assertSiteCanWrite(user.siteId);
    const item = await repo.deactivateSiteUser(segments[1], user.siteId);
    return item ? noContent() : json({ error: "NOT_FOUND" }, 404);
  }

  if (method === "GET" && path === "/settings") {
    requireRole(user, "driver", "warehouse", "accountant");
    return json(await repo.query(`
      select key, value, updated_at as "updatedAt"
      from app_settings
      order by key
    `));
  }
  if ((method === "PUT" || method === "POST") && segments[0] === "settings" && segments[1]) {
    requireRole(user, "admin");
    const body = settingSchema.parse({ key: segments[1], value: payload.value });
    return json(await repo.queryOne(
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

  const masterConfig = masterConfigs[segments[0]];
  if (masterConfig) {
    if (method === "GET" && segments.length === 1) {
      requireRole(user, "driver", "warehouse", "accountant");
      return json(await repo.listMaster(masterConfig.table, masterConfig.column, user.siteId));
    }
    if (method === "POST" && segments.length === 1) {
      requireRole(user, "warehouse");
      await repo.assertSiteCanWrite(user.siteId);
      const body = masterConfig.schema.parse(payload);
      return json(await repo.createNamedMaster({
        column: masterConfig.column,
        entityType: masterConfig.entityType,
        table: masterConfig.table,
        user,
        value: valueFromBody(masterConfig, body),
      }), 201);
    }
    if (method === "PATCH" && segments[1]) {
      requireRole(user, "warehouse");
      await repo.assertSiteCanWrite(user.siteId);
      const body = masterConfig.schema.parse(payload);
      const item = await repo.updateNamedMaster({
        column: masterConfig.column,
        entityType: masterConfig.entityType,
        id: segments[1],
        table: masterConfig.table,
        user,
        value: valueFromBody(masterConfig, body),
      });
      return item ? json(item) : json({ error: "NOT_FOUND" }, 404);
    }
    if (method === "DELETE" && segments[1]) {
      requireRole(user, "warehouse");
      await repo.assertSiteCanWrite(user.siteId);
      const item = await repo.softDeleteMaster({
        entityType: masterConfig.entityType,
        id: segments[1],
        table: masterConfig.table,
        user,
      });
      return item ? noContent() : json({ error: "NOT_FOUND" }, 404);
    }
  }

  return notFound();
}

async function handleApiRequest(request, rawSegments = []) {
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  const user = userFromRequest(request);

  try {
    const payload = await bodyJson(request);
    return await handleOperation({
      method: request.method.toUpperCase(),
      payload,
      request,
      segments,
      user,
    });
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    return json(
      {
        code: error.code,
        error: error.code || "API_ERROR",
        message: error.message || "Không thể xử lý API.",
      },
      status,
    );
  }
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return "Người dùng API";
  }
}

module.exports = { handleApiRequest };
