const crypto = require("node:crypto");
const repo = require("../repository");
const { userSchema, userUpdateSchema } = require("../validators");

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

function listUsers() {
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

async function createUser(payload) {
  const body = userSchema.parse(payload);
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
  return publicUser(item);
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
      body.phone || current.phone,
      body.password ? hashPassword(body.password) : current.password_hash,
      body.role || current.role,
      id,
    ],
  );
  return publicUser(item);
}

async function deleteUser(id) {
  return repo.queryOne(
    `
      update users
      set is_active = false, updated_at = now()
      where id = $1 and is_active = true
      returning id
    `,
    [id],
  );
}

module.exports = {
  createUser,
  deleteUser,
  listUsers,
  publicUser,
  updateUser,
};
