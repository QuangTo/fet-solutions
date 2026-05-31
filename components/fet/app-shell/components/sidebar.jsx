"use client";

import { useState } from "react";
import { pages, roleCanAccessPage } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { iconMap, pageOrder } from "../lib/constants";
import { AccountDialog } from "./account-dialog";
import { AppFooter } from "./app-footer";
import { FetBrandMark } from "./fet-brand-mark";

function userInitial(name = "") {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function Sidebar({
  activePage,
  activeRole,
  billingLockPage = "dashboard",
  mobileNavOpen,
  navigate,
  onPrefetchPage,
  onLogout,
  onPasswordChange,
  pageAccess,
  passwordPending,
  session,
  siteBillingLocked = false,
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const visiblePages = pageOrder.filter((pageName) =>
    roleCanAccessPage(pageAccess, activeRole, pageName),
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[min(240px,84vw)] -translate-x-full flex-col border-r border-zinc-200 bg-[var(--shell-sidebar)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
        mobileNavOpen && "translate-x-0 shadow-xl",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-zinc-200/80 px-3">
        <button
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => navigate("dashboard")}
          type="button"
        >
          <FetBrandMark size="nav" />
          <span className="truncate text-ui-nav font-normal text-zinc-600">
            Quản lý Logistics
          </span>
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-1.5 px-2 text-ui-label font-medium uppercase tracking-wide text-zinc-400">
          Menu
        </p>
        <div className="grid gap-0.5">
          {visiblePages.map((pageName) => {
            const item = pages[pageName];
            const Icon = iconMap[item.icon];
            const isActive = activePage === pageName;
            const menuLocked =
              siteBillingLocked && pageName !== billingLockPage;
            return (
              <button
                aria-disabled={menuLocked}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ui-nav font-medium transition-colors",
                  isActive
                    ? "bg-zinc-200/70 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  menuLocked && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
                key={pageName}
                onClick={() => navigate(pageName)}
                onFocus={() => {
                  if (!menuLocked) onPrefetchPage?.(pageName);
                }}
                onMouseEnter={() => {
                  if (!menuLocked) onPrefetchPage?.(pageName);
                }}
                type="button"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-zinc-800" : "text-zinc-500",
                  )}
                />
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <button
        className="flex shrink-0 items-center gap-2.5 border-t border-zinc-200 px-3 py-2.5 text-left transition-colors hover:bg-zinc-100"
        onClick={() => setAccountOpen(true)}
        type="button"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-200 text-ui-xs font-semibold text-zinc-700">
          {userInitial(session.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ui-sm font-medium text-zinc-900">
            Xin chào {session.name}
          </span>
        </span>
      </button>

      <AppFooter className="border-t border-zinc-200/80" />

      <AccountDialog
        isPending={passwordPending}
        open={accountOpen}
        onLogout={onLogout}
        onOpenChange={setAccountOpen}
        onPasswordChange={onPasswordChange}
        session={session}
      />
    </aside>
  );
}
