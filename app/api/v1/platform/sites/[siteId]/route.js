import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import { platformSiteUpdateSchema } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json } = http;

export const PATCH = withApi(async ({ body, params, user }) => {
  await repo.assertPlatformAdmin(user);
  const site = await repo.updatePlatformSite(
    params.siteId,
    platformSiteUpdateSchema.parse(body),
    user,
  );
  return site ? json(site) : json({ error: "NOT_FOUND" }, 404);
});
