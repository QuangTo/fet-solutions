import {
  FileCheck2,
  LayoutDashboard,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { composeState, pageOrder, pagePaths } from "@/lib/fet-domain";

export { pageOrder, pagePaths };

export const SESSION_KEY = "fet-logistics-session";
export const DISPATCH_PREFS_KEY = "fet-dispatch-prefs";
export const SELECTED_CUSTOMER_KEY = "fet-selected-customer";

export const iconMap = {
  FileCheck2,
  LayoutDashboard,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
};

export const emptyState = composeState({});

export const primaryActionButtonShellClass =
  "w-[clamp(10rem,34%,14rem)] max-w-full justify-self-center";

export const operationActionButtonShellClass =
  "w-[clamp(20rem,68%,28rem)] max-w-full justify-self-center";
