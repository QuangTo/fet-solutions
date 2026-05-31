"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import FetAppShell from "./app-shell";
import { pageIdFromPathname } from "@/lib/fet-domain";
import { stripRouteBase } from "./app-shell/lib/routing";

export function FetAppRouterShell({ routeBase = "", siteSlug = "" }) {
  const pathname = usePathname();
  const relativePathname = useMemo(
    () => stripRouteBase(pathname, routeBase),
    [pathname, routeBase],
  );
  const initialPage = useMemo(
    () => pageIdFromPathname[relativePathname] || "dashboard",
    [relativePathname],
  );

  return (
    <FetAppShell
      initialPage={initialPage}
      routeBase={routeBase}
      siteSlug={siteSlug}
    />
  );
}
