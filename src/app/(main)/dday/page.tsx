import { createClient } from "@/lib/supabase/server";
import { toDateString, daysUntil, ddayLabel, formatKoreanDate, cn } from "@/lib/utils";
import { EVENT_META } from "@/lib/event-meta";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import type { ClassEvent } from "@/lib/database.types";

export const metadata = { title: "디데이" };

export default async function DdayPage() {
  const supabase = await createClient();
  const todayStr = toDateString(new Date());

  const { data } = await supabase.from("events").select("*").order("date");
  const events = (data ?? []) as ClassEvent[];

  // 다가오는 일정(가까운 순) / 지난 일정(최근 순, 접힘)
  const upcoming = events.filter((e) => (e.end_date ?? e.date) >= todayStr);
  const past = events.filter((e) => (e.end_date ?? e.date) < todayStr).reverse();

  return (
    <div>
      <PageHeader
        title="디데이"
        description="등록된 모든 일정의 남은 날짜를 자동으로 계산해요."
      />

      {upcoming.length === 0 ? (
        <Card>
          <EmptyState title="예정된 일정이 없어요" description="캘린더에 일정이 등록되면 여기에 표시돼요." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {upcoming.map((ev) => {
            const d = daysUntil(ev.date);
            const urgent = d >= 0 && d <= 3;
            return (
              <li key={ev.id}>
                <Card
                  className={cn(
                    "flex items-center gap-4",
                    urgent && "border-rose-300 ring-2 ring-rose-500/10 dark:border-rose-900"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl font-bold",
                      urgent
                        ? "bg-rose-500 text-white"
                        : "bg-primary-soft text-indigo-600 dark:text-indigo-300"
                    )}
                  >
                    <span className="text-base leading-tight">
                      {ddayLabel(d < 0 ? 0 : d)}
                    </span>
                    {d < 0 && <span className="text-[10px] font-medium">진행 중</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{ev.title}</p>
                      <Badge color={EVENT_META[ev.type].badge}>
                        {EVENT_META[ev.type].label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatKoreanDate(ev.date)}
                      {ev.end_date && ` ~ ${formatKoreanDate(ev.end_date)}`}
                    </p>
                    {ev.exam_scope && ev.exam_scope.length > 0 && (
                      <p className="mt-1 truncate text-xs text-muted">
                        📚 {ev.exam_scope.map((s) => `${s.subject}(${s.scope})`).join(" · ")}
                      </p>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* 지난 일정 (접힘 처리) */}
      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
            지난 일정 {past.length}개 보기
          </summary>
          <ul className="mt-3 flex flex-col gap-2 opacity-70">
            {past.map((ev) => (
              <li key={ev.id}>
                <Card className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 text-center text-sm font-semibold text-muted">
                    {ddayLabel(daysUntil(ev.date))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{ev.title}</span>
                  <span className="text-xs text-muted">{formatKoreanDate(ev.date, false)}</span>
                </Card>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
