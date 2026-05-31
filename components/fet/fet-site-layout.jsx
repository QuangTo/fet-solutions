"use client";

import dynamic from "next/dynamic";
import { SessionBootstrapScreen } from "@/components/fet/app-shell/components/login-screen";

const FetAppRouterShell = dynamic(
  () =>
    import("@/components/fet/fet-app-router").then((module) => module.FetAppRouterShell),
  {
    loading: () => <SessionBootstrapScreen />,
    ssr: false,
  },
);

export function FetSiteLayout({ siteSlug }) {
  return (
    <FetAppRouterShell routeBase={`/${siteSlug}`} siteSlug={siteSlug} />
  );
}
