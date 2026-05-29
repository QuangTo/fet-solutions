import http from "@/lib/server/http";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(() => ({ ok: true }), { public: true });
