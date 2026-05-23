"use client";

import dynamic from "next/dynamic";
import { RouteSkeleton } from "./route-skeleton";

const FetAppShell = dynamic(() => import("./app-shell"), {
  loading: () => <RouteSkeleton />,
});

export function LazyFetApp({ initialPage }) {
  return <FetAppShell initialPage={initialPage} />;
}
