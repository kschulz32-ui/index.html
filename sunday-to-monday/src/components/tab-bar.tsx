"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_TABS = [
  { href: "/recap", label: "Recap" },
  { href: "/today", label: "Today" },
  { href: "/log", label: "Log" },
] as const;

export function TabBar({ showLeader }: { showLeader: boolean }) {
  const path = usePathname();
  const tabs = showLeader ? [...BASE_TABS, { href: "/leader", label: "Leader" }] : BASE_TABS;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-[520px]">
        {tabs.map((t) => {
          const active = path === t.href || path.startsWith(t.href + "/");
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-sm font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span aria-hidden className={`h-1 w-6 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
