"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "今日" },
  { href: "/daily/", label: "日報" },
  { href: "/trends/", label: "各站排行" },
  { href: "/sources/", label: "觀測站" }
];

function normalize(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function SiteNav() {
  const pathname = normalize(usePathname() ?? "/");

  return (
    <nav aria-label="主要導覽" className="-mx-1 flex overflow-x-auto">
      {navItems.map((item) => {
        const active = normalize(item.href) === pathname;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-2.5 py-2.5 text-body font-semibold hover:no-underline sm:px-3 ${
              active ? "border-shell-ink text-shell-ink" : "border-transparent text-shell-ink-2 hover:text-shell-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
