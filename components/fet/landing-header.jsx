"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function LandingHeader({ navItems }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#bccac0] bg-[#ffffff]/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-black text-[#059669] sm:text-2xl"
          aria-label="Trang chủ LMS"
        >
          LMS
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map(([label, href], index) => (
            <a
              key={label}
              className={
                index === 0
                  ? "border-b-2 border-[#059669] pb-1 text-base font-semibold text-[#059669]"
                  : "text-base font-medium text-[#3d4a42] transition-colors hover:text-[#059669]"
              }
              href={href}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center md:hidden">
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#bccac0] text-[#131b2e]"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            aria-label="Đóng menu"
            className="fixed inset-0 top-14 z-40 bg-[#131b2e]/20 sm:top-16 md:hidden"
            onClick={closeMenu}
            type="button"
          />
          <nav
            className="absolute inset-x-0 top-full z-50 flex flex-col border-b border-[#bccac0] bg-[#ffffff] px-4 py-4 shadow-lg md:hidden"
          >
            <ul className="grid gap-1">
              {navItems.map(([label, href]) => (
                <li key={label}>
                  <a
                    className="block rounded-lg px-3 py-3 text-base font-semibold text-[#131b2e] transition-colors hover:bg-[#059669]/5 hover:text-[#059669]"
                    href={href}
                    onClick={closeMenu}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </header>
  );
}
