import {
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { composeState, loginPath, pageOrder, pagePaths } from "@/lib/fet-domain";

export { loginPath as LOGIN_PATH, pageOrder, pagePaths };

export const LEGACY_SESSION_KEY = "fet-logistics-session";
export const SESSION_KEY = "lms-logistics-session";
export const DISPATCH_PREFS_KEY = "lms-dispatch-prefs";
export const SELECTED_CUSTOMER_KEY = "lms-selected-customer";
export const SUPPORT_CHAT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL || "https://t.me/dosh_010";

export const iconMap = {
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
};

export const emptyState = composeState({});

export const primaryActionButtonShellClass =
  "flex w-full justify-center";

export const primaryActionButtonClass =
  "w-full max-w-[min(100%,11.5rem)] sm:max-w-[13rem]";

/** Centered submit on receipt/dispatch forms; scales on narrow screens. */
export const operationActionButtonShellClass = primaryActionButtonShellClass;

export const operationActionButtonClass = primaryActionButtonClass;
