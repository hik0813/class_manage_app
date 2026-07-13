"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_LABELS } from "@/lib/utils";
import {
  PageHeader,
  Card,
  buttonStyles,
  inputStyles,
  Skeleton,
} from "@/components/ui";
import type { TimetableCell, TimetableOverride } from "@/lib/database.types";

const PERIODS = 7; // 편집 그리드에 표시할 최대 교시

export default function AdminTimetablePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** grid[dow-1][period-1] = 과목명 */
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: 5 }, () => Array(PERIODS).fill(""))
  );
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [ovForm, setOvForm] = useState({ date: "", period: "1", subject: "", note: "" });

  useEffect(() => {
    (async () => {
      const [cellsRes, ovRes] = await Promise.all([
        supabase.from("timetables").select("*"),
        supabase.from("timetable_overrides").select("*").order("date"),
      ]);
      const next = Array.from({ length: 5 }, () => Array(PERIODS).fill(""));
      for (const c of (cellsRes.data ?? []) as TimetableCell[]) {
        if (c.day_of_week <= 5 && c.period <= PERIODS) {
          next[c.day_of_week - 1][c.period - 1] = c.subject;
        }
      }
      setGrid(next);
      setOverrides((ovRes.data ?? []) as TimetableOverride[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveGrid() {
    setSaving(true);
    setMessage(null);
    // 전체 삭제 후 재삽입 (셀 수가 적어 단순한 방식이 안전)
    await supabase.from("timetables").delete().gte("id", 0);
    const rows = grid.flatMap((dayRow, d) =>
      dayRow
        .map((subject, p) => ({
          day_of_week: d + 1,
          period: p + 1,
          subject: subject.trim(),
        }))
        .filter((r) => r.subject)
    );
    const { error } = rows.length
      ? await supabase.from("timetables").insert(rows)
      : { error: null };
    setMessage(error ? `저장 실패: ${error.message}` : "시간표를 저장했어요 ✅");
    setSaving(false);
  }

  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("timetable_overrides")
      .upsert(
        {
          date: ovForm.date,
          period: Number(ovForm.period),
          subject: ovForm.subject.trim(),
          note: ovForm.note.trim() || null,
        },
        { onConflict: "date,period" }
      )
      .select()
      .single();
    if (!error && data) {
      setOverrides((prev) => [
        ...prev.filter((o) => o.id !== (data as TimetableOverride).id),
        data as TimetableOverride,
      ]);
      setOvForm({ date: "", period: "1", subject: "", note: "" });
    }
  }

  async function removeOverride(id: number) {
    await supabase.from("timetable_overrides").delete().eq("id", id);
    setOverrides((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="시간표 편집"
        description="과목명을 입력하고 저장을 누르세요. 빈 칸은 수업 없음으로 처리돼요."
      />

      {loading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-140 border-collapse">
              <thead>
                <tr>
                  <th className="w-10 pb-2 text-xs font-semibold text-muted">교시</th>
                  {WEEKDAY_LABELS.map((l) => (
                    <th key={l} className="pb-2 text-xs font-semibold text-muted">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PERIODS }, (_, p) => (
                  <tr key={p}>
                    <th className="pr-2 text-center text-xs font-semibold text-muted">
                      {p + 1}
                    </th>
                    {WEEKDAY_LABELS.map((_, d) => (
                      <td key={d} className="p-1">
                        <input
                          aria-label={`${WEEKDAY_LABELS[d]}요일 ${p + 1}교시 과목`}
                          value={grid[d][p]}
                          onChange={(e) =>
                            setGrid((prev) => {
                              const next = prev.map((row) => [...row]);
                              next[d][p] = e.target.value;
                              return next;
                            })
                          }
                          className="w-full rounded-lg border border-line bg-background px-2 py-2 text-center text-sm outline-none focus:border-indigo-400"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={saveGrid} disabled={saving} className={buttonStyles.primary}>
                {saving ? "저장 중..." : "시간표 저장"}
              </button>
              {message && <p className="text-sm text-muted">{message}</p>}
            </div>
          </Card>

          {/* 교체 수업 관리 */}
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">임시 시간표 변경 (교체 수업)</h2>
            <form
              onSubmit={addOverride}
              className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_1fr_1fr_auto]"
            >
              <input
                type="date"
                required
                aria-label="날짜"
                value={ovForm.date}
                onChange={(e) => setOvForm({ ...ovForm, date: e.target.value })}
                className={inputStyles}
              />
              <select
                aria-label="교시"
                value={ovForm.period}
                onChange={(e) => setOvForm({ ...ovForm, period: e.target.value })}
                className={inputStyles}
              >
                {Array.from({ length: PERIODS }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}교시
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="변경 과목"
                aria-label="변경 과목"
                value={ovForm.subject}
                onChange={(e) => setOvForm({ ...ovForm, subject: e.target.value })}
                className={inputStyles}
              />
              <input
                placeholder="메모 (선택)"
                aria-label="메모"
                value={ovForm.note}
                onChange={(e) => setOvForm({ ...ovForm, note: e.target.value })}
                className={inputStyles}
              />
              <button type="submit" className={buttonStyles.secondary}>
                추가
              </button>
            </form>

            {overrides.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {overrides.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {o.date} {o.period}교시 → {o.subject}
                    </span>
                    {o.note && <span className="text-muted">({o.note})</span>}
                    <button
                      onClick={() => removeOverride(o.id)}
                      aria-label="삭제"
                      className="ml-auto rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
