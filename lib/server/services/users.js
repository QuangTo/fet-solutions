import repo from "../repository.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import { normalizeRole } from "../../fet-config.js";
import {
  loginSchema,
  passwordChangeSchema,
  userSchema,
  userUpdateSchema,
} from "../validators.js";

function normalizePhone(phone = "") {
  return phone.toString().trim().replace(/\s+/g, "");
}

function normalizeLoginIdentifier(value = "") {
  const normalized = value.toString().trim();
  return /^\d[\d\s]*$/.test(normalized)
    ? normalizePhone(normalized)
    : normalized.toLowerCase();
}

function publicUser(row) {
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    id: row.id,
    isActive: row.isActive,
    isPlatformAdmin: Boolean(row.isPlatformAdmin),
    name: row.name,
    passwordChangeRequired: Boolean(row.passwordChangeRequired),
    phone: row.phone,
    role: normalizeRole(row.role),
    updatedAt: row.updatedAt,
  };
}

async function primarySiteForUser(userId, siteSlug = "", siteId = "") {
  if (userId && siteId) {
    const site = await repo.queryOne(
      `
        select s.id, s.name, s.public_slug as "publicSlug", sm.role
        from site_memberships sm
        join sites s on s.id = sm.site_id
        where sm.user_id = $1
          and sm.is_active = true
          and s.status = 'active'
          and s.id = $2
        limit 1
      `,
      [userId, siteId],
    );
    if (site) return site;

    const error = new Error("Tài khoản không thuộc site này hoặc site không hoạt động.");
    error.statusCode = 403;
    error.code = "SITE_ACCESS_DENIED";
    throw error;
  }

  if (userId && siteSlug) {
    const site = await repo.queryOne(
      `
        select s.id, s.name, s.public_slug as "publicSlug", sm.role
        from site_memberships sm
        join sites s on s.id = sm.site_id
        where sm.user_id = $1
          and sm.is_active = true
          and s.status = 'active'
          and s.public_slug = $2
        limit 1
      `,
      [userId, siteSlug],
    );
    if (site) return site;

    const error = new Error("Tài khoản không thuộc site này hoặc site không hoạt động.");
    error.statusCode = 403;
    error.code = "SITE_ACCESS_DENIED";
    throw error;
  }

  return (
    (userId
      ? await repo.queryOne(
          `
            select s.id, s.name, s.public_slug as "publicSlug", sm.role
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

async function publicSessionUser(row, siteSlug = "", siteId = "") {
  const user = publicUser(row);
  if (!user) return null;
  const site = await primarySiteForUser(user.id, siteSlug, siteId);
  return {
    ...user,
    role: normalizeRole(user.role || site?.role),
    siteId: site?.id || null,
    siteName: site?.name || "",
    siteSlug: site?.publicSlug || siteSlug || "",
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

function phoneExistsError() {
  const error = new Error("Số điện thoại đã được sử dụng.");
  error.statusCode = 409;
  error.code = "USER_PHONE_EXISTS";
  return error;
}

function isUserPhoneUniqueViolation(error) {
  return error?.code === "23505" && error.constraint === "users_phone_unique";
}

const userReturningSql = `
  returning
    id,
    display_name as name,
    phone,
    role,
    is_active as "isActive",
    is_platform_admin as "isPlatformAdmin",
    password_change_required as "passwordChangeRequired",
    created_at as "createdAt",
    updated_at as "updatedAt"
`;

async function createUser(payload) {
  const body = userSchema.parse(payload);
  const phone = normalizePhone(body.phone);
  const password = body.password || phone;
  const passwordHash = hashPassword(password);
  const resolvedSiteId = await repo.resolveSiteId(payload.siteId);
  const existing = await repo.queryOne(
    `
      select
        u.id,
        u.is_active as "isActive",
        exists (
          select 1
          from site_memberships sm
          where sm.site_id = $2
            and sm.user_id = u.id
            and sm.is_active = true
        ) as "hasActiveSiteMembership"
      from users u
      where u.phone = $1
      limit 1
    `,
    [phone, resolvedSiteId],
  );

  if (existing?.hasActiveSiteMembership) {
    throw phoneExistsError();
  }

  let item;
  try {
    item = existing
      ? await repo.queryOne(
          `
            update users
            set display_name = $1,
                password_hash = $2,
                role = $3,
                is_active = true,
                password_change_required = true,
                updated_at = now()
            where id = $4
            ${userReturningSql}
          `,
          [body.name, passwordHash, body.role, existing.id],
        )
      : await repo.queryOne(
          `
            insert into users (
              display_name,
              phone,
              password_hash,
              role,
              password_change_required
            )
            values ($1, $2, $3, $4, true)
            ${userReturningSql}
          `,
          [body.name, phone, passwordHash, body.role],
        );
  } catch (error) {
    if (isUserPhoneUniqueViolation(error)) {
      throw phoneExistsError();
    }
    throw error;
  }

  await upsertSiteMembership(item.id, item.role, resolvedSiteId);
  await syncDriverUser(item.name, item.role, resolvedSiteId);
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
        is_platform_admin as "isPlatformAdmin",
        password_change_required as "passwordChangeRequired",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      where phone = $1 and is_active = true
      limit 1
    `,
    [normalizeLoginIdentifier(body.phone)],
  );

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    const error = new Error("Tài khoản hoặc mật khẩu không đúng.");
    error.statusCode = 401;
    error.code = "INVALID_LOGIN";
    throw error;
  }

  return publicSessionUser(user, body.siteSlug);
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
        is_platform_admin as "isPlatformAdmin",
        password_change_required as "passwordChangeRequired",
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

async function changePassword(userId, payload, siteId = "") {
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
        is_platform_admin as "isPlatformAdmin",
        password_change_required as "passwordChangeRequired",
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
          password_change_required = false,
          updated_at = now()
      where id = $2 and is_active = true
      returning
        id,
        display_name as name,
        phone,
        role,
        is_active as "isActive",
        is_platform_admin as "isPlatformAdmin",
        password_change_required as "passwordChangeRequired",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [hashPassword(body.newPassword), userId],
  );

  return publicSessionUser(item, "", siteId);
}

async function dismissPasswordChangePrompt(userId, siteId = "") {
  const item = await repo.queryOne(
    `
      update users
      set password_change_required = false,
          updated_at = now()
      where id = $1 and is_active = true
      returning
        id,
        display_name as name,
        phone,
        role,
        is_active as "isActive",
        is_platform_admin as "isPlatformAdmin",
        password_change_required as "passwordChangeRequired",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [userId],
  );

  return publicSessionUser(item, "", siteId);
}

export default {
  changePassword,
  createUser,
  dismissPasswordChangePrompt,
  login,
  normalizePhone,
  publicSessionUser,
  updateUser,
};
