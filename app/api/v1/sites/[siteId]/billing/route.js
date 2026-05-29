import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import billing from "@/lib/server/services/billing";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(
  async ({ params, user }) => {
    if (user.role !== "admin" && params.siteId !== user.siteId) {
      const error = new Error("Không có quyền xem billing của site khác.");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
    return billing.enrichBillingPayload(
      await repo.billingSummary(params.siteId),
      user.phone,
    );
  },
  { access: ["quan-ly"], roles: ["admin"] },
);
