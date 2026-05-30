import http from "@/lib/server/http";

export const dynamic = "force-dynamic";

const { clearSessionCookie, noContent } = http;

export async function POST() {
  return clearSessionCookie(noContent());
}
