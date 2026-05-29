import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(() =>
  repo.query(`
    select key, value, updated_at as "updatedAt"
    from app_settings
    order by key
  `),
);
