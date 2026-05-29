import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import users from "@/lib/server/services/users";

export const dynamic = "force-dynamic";

const { withApi, json, readListQuery } = http;

export const GET = withApi(
  ({ url, user }) => repo.listUsers(user.siteId, readListQuery(url)),
  { access: ["quan-ly"] },
);

export const POST = withApi(
  async ({ body, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    return json(await users.createUser({ ...body, siteId: user.siteId }), 201);
  },
  { access: ["quan-ly"] },
);
