import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import billing from "@/lib/server/services/billing";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const PATCH = withApi(
  async ({ params, user }) => {
    const summary = await repo.approveBillingPayment(params.id, user);
    return billing.enrichBillingPayload(summary, user.phone);
  },
  { access: ["quan-ly"], roles: ["admin"] },
);
