import Link from "next/link";
import { Cake, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMeals } from "@/lib/meals";
import {
  toDateString,
  daysUntil,
  ddayLabel,
  formatKoreanDate,
  schoolDayOfWeek,
  timeAgo,
  WEEKDAY_LABELS,
  cn,
} from "@/lib/utils";
import { EVENT_META } from "@/lib/event-meta";
import { Card, CardTitle, Badge, EmptyState } from "@/components/ui";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import type {
  ClassEvent,
  Notice,
  Profile,
  TimetableCell,
  TimetableOverride,
} from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = toDateString(today);
  const dow = schoolDayOfWeek(today);

  const [
    { data: { user } },
    timetableRes,
    overrideRes,
    eventsRes,
    noticesRes,
    profilesRes,
    meals,
  ] = await Promise.all([
    supabase.auth.getUser(),
    dow
      ? supabase.from("timetables").select("*").eq("day_of_week", dow).order("period")
      : Promise.resolve({ data: [] as TimetableCell[] }),
    supabase.from("timetable_overrides").select("*").eq("date", todayStr),
    supabase.from("events").select("*").gte("date", todayStr).order("date").limit(10),
    supabase
      .from("notices")
      .select("id, title, is_pinned, created_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("profiles").select("id, name, birthday").not("birthday", "is", null),
    getMeals(supabase, todayStr, todayStr),
  ]);

  const timetable = (timetableRes.data ?? []) as TimetableCell[];
  const overrides = (overrideRes.data ?? []) as TimetableOverride[];
  const events = ((eventsRes.data ?? []) as ClassEvent[]).slice(0, 3);
  const notices = (noticesRes.data ?? []) as Pick<
    Notice,
    "id" | "title" | "is_pinned" | "created_at"
  >[];

  // 오늘 생일인 친구 찾기 (월-일 비교)
  const mmdd = todayStr.slice(5);
  const birthdayPeople = ((profilesRes.data ?? []) as Pick<
    Profile,
    "id" | "name" | "birthday"
  >[]).filter((p) => p.birthday?.slice(5) === mmdd);

  // 오늘 시간표에 임시 변경(교체 수업) 반영
  const overrideMap = new Map(overrides.map((o) => [o.period, o]));
  const todayMeal = meals[todayStr];

  const me = user
    ? (profilesRes.data ?? []).find((p) => p.id === user.id)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 인사 + 날씨 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{formatKoreanDate(todayStr)}</p>
          <h1 className="text-xl font-bold">
            {me ? `${me.name}님, 안녕하세요! 👋` : "안녕하세요! 👋"}
          </h1>
        </div>
        <WeatherWidget />
      </div>

      {/* 생일 축하 배너 */}
      {birthdayPeople.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 p-4 text-white shadow-lg shadow-pink-500/20">
          <Cake size={28} className="shrink-0" />
          <p className="font-semibold">
            오늘은 {birthdayPeople.map((p) => p.name).join(", ")}님의 생일이에요!
            모두 축하해 주세요 🎉
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 오늘의 시간표 */}
        <Card>
          <CardTitle
            action={
              <Link href="/timetable" className="text-xs text-indigo-500 hover:underline">
                전체 보기
              </Link>
            }
          >
            오늘의 시간표 {dow ? `(${WEEKDAY_LABELS[dow - 1]}요일)` : ""}
          </CardTitle>
          {!dow ? (
            <EmptyState title="오늘은 주말이에요 😴" description="푹 쉬고 월요일에 만나요!" />
          ) : timetable.length === 0 ? (
            <EmptyState title="시간표가 아직 없어요" description="선생님이 곧 등록해 주실 거예요." />
          ) : (
            <ol className="flex flex-col gap-1.5">
              {timetable.map((cell) => {
                const ov = overrideMap.get(cell.period);
                return (
                  <li
                    key={cell.period}
                    className="flex items-center gap-3 rounded-xl bg-background px-3 py-2"
                  >
                    <span className="w-10 shrink-0 text-xs font-semibold text-muted">
                      {cell.period}교시
                    </span>
                    {ov ? (
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <s className="text-muted/60">{cell.subject}</s>
                        <span className="text-indigo-600 dark:text-indigo-300">
                          → {ov.subject}
                        </span>
                        <Badge color="indigo">교체</Badge>
                      </span>
                    ) : (
                      <span className="text-sm font-medium">{cell.subject}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {/* 오늘의 급식 */}
        <Card>
          <CardTitle
            action={
              <Link href="/meals" className="text-xs text-indigo-500 hover:underline">
                주간 급식
              </Link>
            }
          >
            오늘의 급식 🍚
          </CardTitle>
          {todayMeal ? (
            <ul className="flex flex-wrap gap-1.5">
              {todayMeal.split("\n").map((dish) => (
                <li
                  key={dish}
                  className="rounded-lg bg-background px-2.5 py-1.5 text-sm"
                >
                  {dish}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="오늘 급식 정보가 없어요" description="주말이거나 아직 등록 전이에요." />
          )}
        </Card>

        {/* 임박한 디데이 */}
        <Card>
          <CardTitle
            action={
              <Link href="/dday" className="text-xs text-indigo-500 hover:underline">
                전체 보기
              </Link>
            }
          >
            다가오는 디데이 ⏰
          </CardTitle>
          {events.length === 0 ? (
            <EmptyState title="예정된 일정이 없어요" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((ev) => {
                const d = daysUntil(ev.date);
                const urgent = d <= 3; // D-3 이내 강조
                return (
                  <li key={ev.id}>
                    <Link
                      href="/dday"
                      className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5 transition hover:bg-surface-hover"
                    >
                      <span
                        className={cn(
                          "w-14 shrink-0 text-center text-sm font-bold",
                          urgent ? "text-rose-500" : "text-indigo-500"
                        )}
                      >
                        {ddayLabel(d)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-muted">{formatKoreanDate(ev.date)}</p>
                      </div>
                      <Badge color={EVENT_META[ev.type].badge}>
                        {EVENT_META[ev.type].label}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 최근 공지 */}
        <Card>
          <CardTitle
            action={
              <Link href="/notices" className="text-xs text-indigo-500 hover:underline">
                전체 보기
              </Link>
            }
          >
            최근 공지사항 📢
          </CardTitle>
          {notices.length === 0 ? (
            <EmptyState title="공지사항이 없어요" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/notices/${n.id}`}
                    className="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5 transition hover:bg-surface-hover"
                  >
                    {n.is_pinned && <Badge color="red">고정</Badge>}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {timeAgo(n.created_at)}
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
