import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getMeals } from "@/lib/meals";
import { toDateString, formatKoreanDate, cn } from "@/lib/utils";
import { PageHeader, Card, EmptyState, AdminLink } from "@/components/ui";

export const metadata = { title: "급식" };

export default async function MealsPage() {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = toDateString(today);

  // 이번 주 월요일부터 2주간 표시
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(toDateString(d));
  }

  const [profile, meals] = await Promise.all([
    getCurrentProfile(),
    getMeals(supabase, dates[0], dates[dates.length - 1]),
  ]);

  const hasAny = dates.some((d) => meals[d]);

  return (
    <div>
      <PageHeader
        title="급식"
        description="이번 주와 다음 주 중식 메뉴예요."
        action={profile?.role === "admin" ? <AdminLink href="/admin/meals" label="수동 입력" /> : undefined}
      />

      {!hasAny ? (
        <Card>
          <EmptyState
            title="급식 정보가 없어요"
            description="NEIS 학교 코드가 설정되지 않았거나, 급식이 없는 기간이에요. 관리 콘솔에서 직접 입력할 수도 있어요."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dates.map((date) => {
            const menu = meals[date];
            const isToday = date === todayStr;
            return (
              <Card
                key={date}
                className={cn(isToday && "border-indigo-400 ring-2 ring-indigo-500/20")}
              >
                <p
                  className={cn(
                    "mb-2 text-sm font-semibold",
                    isToday ? "text-indigo-600 dark:text-indigo-300" : "text-muted"
                  )}
                >
                  {formatKoreanDate(date)}
                  {isToday && " · 오늘"}
                </p>
                {menu ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {menu.split("\n").map((dish) => (
                      <li key={dish}>{dish}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted/70">등록된 메뉴가 없어요.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
