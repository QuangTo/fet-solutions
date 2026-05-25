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

export default function FetAppLayout() {
  return <FetAppRouterShell />;
}
