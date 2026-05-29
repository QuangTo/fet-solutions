import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import validators from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json } = http;
const { warehouseSchema } = validators;

export const GET = withApi(async ({ user }) => repo.listWarehouses(user.siteId), {
  access: ["dashboard", "nhap-hang", "xuat-hang", "bao-cao", "quan-ly"],
});

export const POST = withApi(
  async ({ body, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    return json(await repo.createWarehouse(warehouseSchema.parse(body), user), 201);
  },
  { access: ["quan-ly"] },
);
