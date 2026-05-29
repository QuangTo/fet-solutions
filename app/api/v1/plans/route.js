import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(async () => repo.listPlans(), {
  access: ["quan-ly"],
  roles: ["admin"],
});
