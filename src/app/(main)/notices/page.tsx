import Link from "next/link";
import { Pin, Search, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { timeAgo, formatKoreanDate } from "@/lib/utils";
import { EVENT_META } from "@/lib/event-meta";
import { PageHeader, Card, Badge, EmptyState, AdminLink, inputStyles } from "@/components/ui";
import type { ClassEvent, Notice } from "@/lib/database.types";

export const metadata = { title: "공지사항" };

type NoticeListItem = Pick<
  Notice,
  "id" | "title" | "content" | "is_pinned" | "created_at"
>;

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  // 공지 검색 (제목·본문) — 검색어가 있으면 일정도 통합 검색
  let noticesQuery = supabase
    .from("notices")
    .select("id, title, content, is_pinned, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (query) {
    noticesQuery = noticesQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
  }

  const [profile, noticesRes, eventsRes] = await Promise.all([
    getCurrentProfile(),
    noticesQuery,
    query
      ? supabase
          .from("events")
          .select("*")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .order("date")
      : Promise.resolve({ data: null }),
  ]);

  const notices = (noticesRes.data ?? []) as NoticeListItem[];
  const matchedEvents = (eventsRes.data ?? []) as ClassEvent[];

  return (
    <div>
      <PageHeader
        title="공지사항"
        action={profile?.role === "admin" ? <AdminLink href="/admin/notices" label="공지 관리" /> : undefined}
      />

      {/* 검색 */}
      <form action="/notices" className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="공지·일정 검색"
          aria-label="공지 및 일정 검색"
          className={inputStyles + " pl-9"}
        />
      </form>

      {/* 통합 검색: 일정 결과 */}
      {query && matchedEvents.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">일정 검색 결과</h2>
          <ul className="flex flex-col gap-2">
            {matchedEvents.map((ev) => (
              <li key={ev.id}>
                <Link href="/calendar">
                  <Card className="flex items-center gap-3 py-3 transition hover:bg-surface-hover">
                    <CalendarDays size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {ev.title}
                    </span>
                    <Badge color={EVENT_META[ev.type].badge}>
                      {EVENT_META[ev.type].label}
                    </Badge>
                    <span className="text-xs text-muted">{formatKoreanDate(ev.date, false)}</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 mt-4 text-sm font-semibold text-muted">공지 검색 결과</h2>
        </div>
      )}

      {notices.length === 0 ? (
        <Card>
          <EmptyState
            title={query ? `"${query}"에 대한 공지가 없어요` : "아직 공지사항이 없어요"}
            description={query ? "다른 키워드로 검색해 보세요." : undefined}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {notices.map((n) => (
            <li key={n.id}>
              <Link href={`/notices/${n.id}`}>
                <Card className="transition hover:bg-surface-hover">
                  <div className="flex items-center gap-2">
                    {n.is_pinned && (
                      <Pin size={14} className="shrink-0 fill-rose-500 text-rose-500" />
                    )}
                    <h3 className="min-w-0 flex-1 truncate font-semibold">{n.title}</h3>
                    <span className="shrink-0 text-xs text-muted">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{n.content}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
