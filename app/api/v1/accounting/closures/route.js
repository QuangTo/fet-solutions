import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import validators from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const { withApi, json, readListQuery } = http;
const { invoiceApprovalSchema } = validators;

export const GET = withApi(
  ({ url, user }) => repo.accountingClosures(user.siteId, readListQuery(url)),
  { access: ["dashboard", "bao-cao"] },
);

export const POST = withApi(
  async ({ body, user }) => {
    await repo.assertSiteCanWrite(user.siteId);
    return json(
      await repo.createInvoiceApproval(invoiceApprovalSchema.parse(body), user),
      201,
    );
  },
  { access: ["bao-cao"], roles: ["admin", "accountant"] },
);
