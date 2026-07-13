import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = { title: "전체 메뉴" };

/** 모바일 하단 탭의 "전체" — 모든 메뉴로 가는 그리드 */
export default async function MenuPage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <PageHeader title="전체 메뉴" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {NAV_ITEMS.filter((i) => i.href !== "/").map(
          ({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface py-5 text-sm font-medium transition hover:bg-surface-hover"
            >
              <Icon size={22} className="text-indigo-500" />
              {label}
            </Link>
          )
        )}
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            className="flex flex-col items-center gap-2 rounded-2xl border border-indigo-200 bg-primary-soft py-5 text-sm font-medium text-indigo-600 transition hover:opacity-90 dark:border-indigo-900 dark:text-indigo-300"
          >
            <ShieldCheck size={22} />
            관리 콘솔
          </Link>
        )}
      </div>
    </div>
  );
}
