"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, buttonStyles, inputStyles } from "@/components/ui";
import SeatGrid, { SeatBox } from "@/components/seats/SeatGrid";
import type { SeatLayout } from "@/lib/database.types";

/**
 * 좌석 구조 설정: 줄(rows) × 칸(cols)을 정하고,
 * 사용하지 않을 좌석을 클릭해서 끌 수 있다.
 */
export default function LayoutEditor({
  layout,
  onSaved,
}: {
  layout: SeatLayout | null;
  onSaved: (l: SeatLayout) => void;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState(layout?.rows ?? 5);
  const [cols, setCols] = useState(layout?.cols ?? 6);
  const [disabled, setDisabled] = useState<Set<number>>(
    new Set(layout?.disabled_seats ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleSeat(i: number) {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = {
      name: "기본 배치",
      rows,
      cols,
      disabled_seats: [...disabled].filter((i) => i < rows * cols),
    };
    // 항상 최신 1개의 레이아웃만 사용: 있으면 수정, 없으면 생성
    const query = layout
      ? supabase.from("seat_layouts").update(payload).eq("id", layout.id).select().single()
      : supabase.from("seat_layouts").insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      setMessage(`저장 실패: ${error?.message ?? ""}`);
      return;
    }
    onSaved(data as SeatLayout);
    setMessage("좌석 구조를 저장했어요 ✅");
  }

  const activeSeats = rows * cols - [...disabled].filter((i) => i < rows * cols).length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="rows" className="mb-1 block text-xs text-muted">
              줄 (앞뒤)
            </label>
            <input
              id="rows"
              type="number"
              min={1}
              max={12}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(12, Number(e.target.value))))}
              className={inputStyles + " w-20"}
            />
          </div>
          <div>
            <label htmlFor="cols" className="mb-1 block text-xs text-muted">
              칸 (좌우)
            </label>
            <input
              id="cols"
              type="number"
              min={1}
              max={12}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value))))}
              className={inputStyles + " w-20"}
            />
          </div>
          <button onClick={save} disabled={saving} className={buttonStyles.primary}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <p className="text-sm text-muted">
            사용 좌석 <span className="font-semibold text-foreground">{activeSeats}</span>개
            {message && <span className="ml-2">{message}</span>}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm text-muted">
          좌석을 클릭하면 사용 안 함으로 바뀌어요. (교탁 옆 빈 공간 등)
        </p>
        <SeatGrid
          rows={rows}
          cols={cols}
          disabledSeats={[]} // 편집 중에는 모두 렌더링하고 스타일로 구분
          renderSeat={(i) => (
            <button
              type="button"
              onClick={() => toggleSeat(i)}
              aria-pressed={disabled.has(i)}
              aria-label={`좌석 ${i + 1} ${disabled.has(i) ? "사용 안 함" : "사용"}`}
              className="w-full"
            >
              <SeatBox variant={disabled.has(i) ? "empty" : "default"}>
                {disabled.has(i) ? "✕" : i + 1}
              </SeatBox>
            </button>
          )}
        />
      </Card>
    </div>
  );
}
