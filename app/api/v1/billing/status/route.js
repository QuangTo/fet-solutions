import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import billing from "@/lib/server/services/billing";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(async ({ user }) =>
  billing.enrichBillingStatus(await repo.siteBillingStatus(user.siteId), user.phone),
);
