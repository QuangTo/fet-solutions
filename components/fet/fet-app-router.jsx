"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import FetAppShell from "./app-shell";
import { pageIdFromPathname } from "@/lib/fet-domain";

export function FetAppRouterShell() {
  const pathname = usePathname();
  const initialPage = useMemo(
    () => pageIdFromPathname[pathname] || "dashboard",
    [pathname],
  );

  return <FetAppShell initialPage={initialPage} />;
}
