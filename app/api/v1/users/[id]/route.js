import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import users from "@/lib/server/services/users";

export const dynamic = "force-dynamic";

const { withApi, json, noContent } = http;

export const PATCH = withApi(
  async ({ body, params, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    const item = await users.updateUser(params.id, {
      ...body,
      siteId: user.siteId,
    });
    return item ? json(item) : json({ error: "NOT_FOUND" }, 404);
  },
  { access: ["quan-ly"] },
);

export const DELETE = withApi(
  async ({ params, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    const item = await repo.deactivateSiteUser(params.id, user.siteId);
    return item ? noContent() : json({ error: "NOT_FOUND" }, 404);
  },
  { access: ["quan-ly"] },
);
