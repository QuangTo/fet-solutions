import repo from "../repository.js";
import {
  defaultPageAccess,
  normalizePageAccess,
  parseSettingValue,
} from "../page-access.js";

function normalizeUiSettings(value) {
  return {
    accent: ["blue", "slate"].includes(value?.accent) ? "blue" : "emerald",
    density: value?.density === "compact" ? "compact" : "comfortable",
  };
}

async function loadSettingValue(key, siteId) {
  const resolvedSiteId = await repo.resolveSiteId(siteId);
  const row = await repo.queryOne(
    "select value from app_settings where site_id = $1 and key = $2 limit 1",
    [resolvedSiteId, key],
  );
  return parseSettingValue(row?.value);
}

async function loadUiSettings(siteId) {
  return normalizeUiSettings(await loadSettingValue("ui", siteId));
}

async function loadPageAccess(siteId) {
  return normalizePageAccess(
    (await loadSettingValue("pageAccess", siteId)) || defaultPageAccess(),
  );
}

async function upsertAppSetting(key, value, siteId) {
  const resolvedSiteId = await repo.resolveSiteId(siteId);
  return repo.queryOne(
    `
      insert into app_settings (site_id, key, value)
      values ($1, $2, $3::jsonb)
      on conflict (site_id, key) do update
      set value = excluded.value, updated_at = now()
      returning site_id as "siteId", key, value, updated_at as "updatedAt"
    `,
    [resolvedSiteId, key, JSON.stringify(value)],
  );
}

export { loadPageAccess, loadUiSettings, upsertAppSetting };

export default {
  loadPageAccess,
  loadUiSettings,
  upsertAppSetting,
};
