import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import { platformSiteSchema } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json } = http;

export const GET = withApi(async ({ user }) => {
  await repo.assertPlatformAdmin(user);
  return repo.listPlatformSites();
});

export const POST = withApi(async ({ body, user }) => {
  await repo.assertPlatformAdmin(user);
  const site = await repo.createPlatformSite(platformSiteSchema.parse(body), user);
  return json(site, 201);
});
