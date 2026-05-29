import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import validators from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json, noContent } = http;
const { warehouseSchema } = validators;

export const PATCH = withApi(
  async ({ body, params, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    const updated = await repo.updateWarehouse(
      params.id,
      warehouseSchema.parse(body),
      user,
    );
    return updated ? json(updated) : json({ error: "NOT_FOUND" }, 404);
  },
  { access: ["quan-ly"] },
);

export const DELETE = withApi(
  async ({ params, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    const removed = await repo.softDeleteWarehouse(params.id, user);
    return removed ? noContent() : json({ error: "NOT_FOUND" }, 404);
  },
  { access: ["quan-ly"] },
);
