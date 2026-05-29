const repo = require("../repository");
const { hashPassword, verifyPassword } = require("../passwords");
const { normalizeRole } = require("../roles");
const {
  loginSchema,
  passwordChangeSchema,
  userSchema,
  userUpdateSchema,
} = require("../validators");

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
    role: normalizeRole(user.role || site?.role),
    siteId: site?.id || null,
    siteName: site?.name || "",
  };
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

module.exports = {
  changePassword,
  createUser,
  login,
  normalizePhone,
  publicSessionUser,
  updateUser,
};
