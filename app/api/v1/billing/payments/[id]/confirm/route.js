import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const POST = withApi(
  async ({ params, user }) =>
    repo.confirmBillingPayment(params.id, user.siteId, user),
  { access: ["quan-ly"], roles: ["admin"] },
);
