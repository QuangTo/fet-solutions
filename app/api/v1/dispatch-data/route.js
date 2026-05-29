import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi, readListFilters, readListQuery } = http;

export const GET = withApi(
  ({ url, user }) =>
    repo.dispatchData(user.siteId, {
      dispatchFilters: readListFilters(url),
      dispatches: readListQuery(url),
    }),
  { access: ["xuat-hang"] },
);
