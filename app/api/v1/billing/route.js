import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import billing from "@/lib/server/services/billing";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(
  async ({ user }) =>
    billing.enrichBillingPayload(await repo.billingSummary(user.siteId), user.phone),
  { access: ["quan-ly"], roles: ["admin"] },
);
