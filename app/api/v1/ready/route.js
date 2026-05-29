import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(
  async () => {
    await repo.query("select 1 as ok");
    return { ok: true };
  },
  { public: true },
);
