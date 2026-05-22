const repo = require("../repository");
const { settingSchema } = require("../validators");

function listSettings() {
  return repo.query(`
    select key, value, updated_at as "updatedAt"
    from app_settings
    order by key
  `);
}

function upsertSetting(key, payload) {
  const body = settingSchema.parse({
    key,
    value: payload.value,
  });
  return repo.queryOne(
    `
      insert into app_settings (key, value)
      values ($1, $2::jsonb)
      on conflict (key) do update
      set value = excluded.value, updated_at = now()
      returning key, value, updated_at as "updatedAt"
    `,
    [body.key, JSON.stringify(body.value)],
  );
}

module.exports = {
  listSettings,
  upsertSetting,
};
