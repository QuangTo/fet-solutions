"use client";

import { ChevronDown, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  normalizeRole,
  pages,
  roleCanAccessPage,
  roles,
} from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { iconMap, pageOrder, SUPPORT_CHAT_URL } from "../lib/constants";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const visiblePages = pageOrder.filter((pageName) =>
    roleCanAccessPage(pageAccess, activeRole, pageName),
  );
  const userName = session.name || "Người dùng";
  const userRole = roles[normalizeRole(session.role)] || "Người dùng";
  const LogOutIcon = iconMap.LogOut;
  const SupportIcon = iconMap.MessageCircle;

  function openSupportChat() {
    setUserMenuOpen(false);
    window.open(SUPPORT_CHAT_URL, "_blank", "noopener,noreferrer");
  }

  function openAccountDialog() {
    setUserMenuOpen(false);
    setAccountOpen(true);
  }

  function handleLogout() {
    setUserMenuOpen(false);
    onLogout();
  }

  useEffect(() => {
    if (!userMenuOpen) return;

    function handlePointerDown(event) {
      if (userMenuRef.current?.contains(event.target)) return;
      setUserMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setUserMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

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

      <div className="relative shrink-0 p-2" ref={userMenuRef}>
        {userMenuOpen ? (
          <div
            className="absolute bottom-full left-2 right-2 z-10 mb-2 grid gap-1 rounded-md border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10"
            id="sidebar-user-actions"
          >
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ui-nav font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              onClick={openAccountDialog}
              type="button"
            >
              <KeyRound className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="truncate">Đổi mật khẩu</span>
            </button>
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ui-nav font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              onClick={openSupportChat}
              type="button"
            >
              <SupportIcon className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="truncate">Chat support</span>
            </button>
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ui-nav font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
              type="button"
            >
              <LogOutIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">Đăng xuất</span>
            </button>
          </div>
        ) : null}

        <button
          aria-controls="sidebar-user-actions"
          aria-expanded={userMenuOpen}
          className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left shadow-sm shadow-zinc-900/5 transition-colors hover:border-zinc-300 hover:bg-white"
          onClick={() => setUserMenuOpen((open) => !open)}
          title={`Xin chào ${userName}`}
          type="button"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-200 text-ui-xs font-semibold text-zinc-700">
            {userInitial(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui-sm font-semibold text-zinc-900">
              {userName}
            </span>
            <span className="block truncate text-ui-xs font-medium text-zinc-500">
              {userRole}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
              userMenuOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      <AppFooter className="border-t border-zinc-200/80" />

      <AccountDialog
        isPending={passwordPending}
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onPasswordChange={onPasswordChange}
        session={session}
      />
    </aside>
  );
}
