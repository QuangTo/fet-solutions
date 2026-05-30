import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loginPath, pagePaths } = require("./lib/fet-config.cjs");
const {
  applySessionHeaders,
  isPublicApiPath,
  readSessionCookie,
  verifySessionToken,
} = require("./lib/server/session-auth.js");

export const runtime = "nodejs";

const protectedAppPaths = new Set(Object.values(pagePaths));
const homePath = pagePaths.dashboard;

function readVerifiedSession(request) {
  return verifySessionToken(readSessionCookie(request));
}

function handleApi(request, pathname) {
  if (isPublicApiPath(pathname, request.method)) {
    return NextResponse.next();
  }

  const session = readVerifiedSession(request);
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

function handleAppPage(request, pathname) {
  const session = readVerifiedSession(request);
  const loginUrl = new URL(loginPath, request.url);

  if (pathname === loginPath) {
    if (session?.id) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    return NextResponse.next();
  }

  if (!session?.id) {
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1")) {
    return handleApi(request, pathname);
  }

  if (protectedAppPaths.has(pathname) || pathname === loginPath) {
    return handleAppPage(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/tong-quan",
    "/nhap-hang",
    "/xuat-hang",
    "/bao-cao",
    "/quan-ly",
    "/cai-dat",
    "/dang-nhap",
  ],
};
