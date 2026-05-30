import repo from "../repository.js";
import {
  defaultPageAccess,
  normalizePageAccess,
  parseSettingValue,
} from "../page-access.js";

async function loadUiSettings() {
  const row = await repo.queryOne(
    "select value from app_settings where key = $1 limit 1",
    ["ui"],
  );
  const value = parseSettingValue(row?.value);
  if (!value) {
    return { accent: "emerald", density: "comfortable" };
  }
  return {
    accent: value.accent === "slate" ? "slate" : "emerald",
    density: value.density === "compact" ? "compact" : "comfortable",
  };
}

async function loadPageAccess() {
  const row = await repo.queryOne(
    "select value from app_settings where key = $1 limit 1",
    ["pageAccess"],
  );
  return normalizePageAccess(
    parseSettingValue(row?.value) || defaultPageAccess(),
  );
}

async function upsertAppSetting(key, value) {
  return repo.queryOne(
    `
      insert into app_settings (key, value)
      values ($1, $2::jsonb)
      on conflict (key) do update
      set value = excluded.value, updated_at = now()
      returning key, value, updated_at as "updatedAt"
    `,
    [key, JSON.stringify(value)],
  );
}

export { loadPageAccess, loadUiSettings, upsertAppSetting };

export default {
  loadPageAccess,
  loadUiSettings,
  upsertAppSetting,
};
