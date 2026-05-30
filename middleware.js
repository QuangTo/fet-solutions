import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  applySessionHeaders,
  isPublicApiPath,
  readSessionCookie,
  verifySessionToken,
} = require("./lib/server/session-auth.js");

export const runtime = "nodejs";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  if (isPublicApiPath(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = readSessionCookie(request);
  const session = verifySessionToken(token);
  if (!session?.id) {
    return NextResponse.json(
      {
        code: "AUTH_REQUIRED",
        error: "AUTH_REQUIRED",
        message: "Cần đăng nhập để xem dữ liệu site.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestHeaders = new Headers(request.headers);
  applySessionHeaders(requestHeaders, session);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/api/v1/:path*",
};
