import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(async ({ user }) => {
  const siteId = await repo.resolveSiteId(user.siteId);
  return repo.query(`
    select site_id as "siteId", key, value, updated_at as "updatedAt"
    from app_settings
    where site_id = $1
    order by key
  `, [siteId]);
});
