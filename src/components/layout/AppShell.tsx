"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS, TAB_ITEMS } from "./nav-items";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  userName: string;
  userId: string;
  isAdmin: boolean;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppShell({ children, userName, userId, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh w-full">
      {/* ---------- 데스크톱 사이드바 ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <GraduationCap size={20} />
          </div>
          <span className="text-lg font-bold">우리반</span>
        </div>

        <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive(pathname, href)
                      ? "bg-primary-soft text-indigo-600 dark:text-indigo-300"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li className="mt-2 border-t border-line pt-2">
                <Link
                  href="/admin"
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    pathname.startsWith("/admin")
                      ? "bg-primary-soft text-indigo-600 dark:text-indigo-300"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <ShieldCheck size={18} />
                  관리 콘솔
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center justify-between gap-1 rounded-xl px-2 py-1.5">
            <span className="truncate text-sm font-medium">{userName}</span>
            <div className="flex items-center">
              <ThemeToggle />
              <button
                onClick={signOut}
                aria-label="로그아웃"
                className="rounded-xl p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- 본문 ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 상단 바 */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap size={17} />
            </div>
            우리반
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell userId={userId} />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* ---------- 모바일 하단 탭 ---------- */}
      <nav
        aria-label="하단 탭"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {TAB_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  isActive(pathname, href)
                    ? "text-indigo-600 dark:text-indigo-300"
                    : "text-muted"
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
