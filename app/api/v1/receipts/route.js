import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import validators from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json, readListFilters, readListQuery } = http;
const { receiptSchema } = validators;

export const GET = withApi(
  ({ url, user }) =>
    repo.listReceiptsPaginated(user.siteId, readListFilters(url), readListQuery(url)),
  { access: ["nhap-hang", "bao-cao"] },
);

export const POST = withApi(
  async ({ body, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    return json(await repo.createReceipt(receiptSchema.parse(body), user), 201);
  },
  { access: ["nhap-hang"] },
);
