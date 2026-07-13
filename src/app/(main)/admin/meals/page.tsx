"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDate } from "@/lib/utils";
import { PageHeader, Card, buttonStyles, inputStyles } from "@/components/ui";
import type { Meal } from "@/lib/database.types";

/** 급식 수동 입력 — NEIS 자동 조회 실패 시 폴백. 같은 날짜는 수동 입력이 우선 적용됨 */
export default function AdminMealsPage() {
  const supabase = createClient();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [date, setDate] = useState("");
  const [menu, setMenu] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("meals")
      .select("*")
      .order("date", { ascending: false })
      .limit(30)
      .then(({ data }) => setMeals((data ?? []) as Meal[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = { date, menu: menu.trim() };
    const { error } = await supabase.from("meals").upsert(row);
    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }
    setMeals((prev) => [row as Meal, ...prev.filter((m) => m.date !== date)]);
    setDate("");
    setMenu("");
    setMessage("저장했어요 ✅");
  }

  async function remove(d: string) {
    await supabase.from("meals").delete().eq("date", d);
    setMeals((prev) => prev.filter((m) => m.date !== d));
  }

  return (
    <div>
      <PageHeader
        title="급식 수동 입력"
        description="NEIS 자동 조회가 안 될 때 직접 입력하세요. 메뉴는 줄바꿈으로 구분해요."
      />

      <Card>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input
            type="date"
            required
            aria-label="날짜"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputStyles}
          />
          <textarea
            required
            rows={5}
            placeholder={"보리밥\n미역국\n제육볶음\n김치"}
            aria-label="메뉴"
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
            className={inputStyles}
          />
          <div className="flex items-center gap-3">
            <button type="submit" className={buttonStyles.primary}>
              저장
            </button>
            {message && <p className="text-sm text-muted">{message}</p>}
          </div>
        </form>
      </Card>

      {meals.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 text-sm font-semibold">수동 입력된 급식</h2>
          <ul className="flex flex-col gap-2">
            {meals.map((m) => (
              <li
                key={m.date}
                className="flex items-start gap-3 rounded-xl bg-background px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{formatKoreanDate(m.date)}</p>
                  <p className="whitespace-pre-line text-sm text-muted">{m.menu}</p>
                </div>
                <button
                  onClick={() => remove(m.date)}
                  aria-label="삭제"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-rose-500"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
