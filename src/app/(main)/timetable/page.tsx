import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  toDateString,
  schoolDayOfWeek,
  WEEKDAY_LABELS,
  formatKoreanDate,
  cn,
} from "@/lib/utils";
import { PageHeader, Card, EmptyState, AdminLink, Badge } from "@/components/ui";
import type { TimetableCell, TimetableOverride } from "@/lib/database.types";

export const metadata = { title: "시간표" };

/** 이번 주 월~금 날짜 문자열 */
function thisWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0(일) ~ 6(토)
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateString(d);
  });
}

export default async function TimetablePage() {
  const supabase = await createClient();
  const weekDates = thisWeekDates();
  const todayDow = schoolDayOfWeek();

  const [profile, cellsRes, overridesRes] = await Promise.all([
    getCurrentProfile(),
    supabase.from("timetables").select("*").order("period"),
    supabase
      .from("timetable_overrides")
      .select("*")
      .gte("date", weekDates[0])
      .lte("date", weekDates[4]),
  ]);

  const cells = (cellsRes.data ?? []) as TimetableCell[];
  const overrides = (overridesRes.data ?? []) as TimetableOverride[];

  const maxPeriod = Math.max(0, ...cells.map((c) => c.period));
  const grid = new Map<string, TimetableCell>();
  for (const c of cells) grid.set(`${c.day_of_week}-${c.period}`, c);
  const ovMap = new Map<string, TimetableOverride>();
  for (const o of overrides) {
    const dow = weekDates.indexOf(o.date) + 1;
    if (dow >= 1) ovMap.set(`${dow}-${o.period}`, o);
  }

  return (
    <div>
      <PageHeader
        title="시간표"
        description="이번 주 수업 시간표예요. 교체 수업은 화살표로 표시돼요."
        action={profile?.role === "admin" ? <AdminLink href="/admin/timetable" label="편집" /> : undefined}
      />

      {cells.length === 0 ? (
        <Card>
          <EmptyState
            title="아직 시간표가 등록되지 않았어요"
            description="관리 콘솔 > 시간표 편집에서 등록할 수 있어요."
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-130 border-collapse text-sm">
            <caption className="sr-only">주간 시간표</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-12 px-2 py-3 text-xs font-semibold text-muted">
                  교시
                </th>
                {WEEKDAY_LABELS.map((label, i) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "px-2 py-3 text-xs font-semibold",
                      todayDow === i + 1
                        ? "bg-primary-soft text-indigo-600 dark:text-indigo-300"
                        : "text-muted"
                    )}
                  >
                    {label}
                    <span className="ml-1 font-normal opacity-70">
                      {weekDates[i].slice(8)}일
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, p) => p + 1).map((period) => (
                <tr key={period} className="border-b border-line last:border-0">
                  <th
                    scope="row"
                    className="px-2 py-3 text-center text-xs font-semibold text-muted"
                  >
                    {period}
                  </th>
                  {WEEKDAY_LABELS.map((_, i) => {
                    const dow = i + 1;
                    const cell = grid.get(`${dow}-${period}`);
                    const ov = ovMap.get(`${dow}-${period}`);
                    return (
                      <td
                        key={dow}
                        className={cn(
                          "px-2 py-3 text-center",
                          todayDow === dow && "bg-primary-soft/60"
                        )}
                      >
                        {ov ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <s className="text-xs text-muted/60">{cell?.subject}</s>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                              {ov.subject}
                            </span>
                          </span>
                        ) : (
                          <span className={cn(todayDow === dow && "font-semibold")}>
                            {cell?.subject ?? ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* 이번 주 교체 수업 안내 */}
      {overrides.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">이번 주 교체 수업</h2>
          <ul className="flex flex-col gap-1.5">
            {overrides
              .sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period))
              .map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge color="indigo">
                    {formatKoreanDate(o.date)} {o.period}교시
                  </Badge>
                  <span className="font-medium">{o.subject}</span>
                  {o.note && <span className="text-muted">— {o.note}</span>}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
