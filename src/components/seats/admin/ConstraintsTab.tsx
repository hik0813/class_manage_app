"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, buttonStyles, inputStyles, EmptyState } from "@/components/ui";
import SeatGrid, { SeatBox } from "@/components/seats/SeatGrid";
import type { SeatConstraint, SeatLayout } from "@/lib/database.types";
import type { StudentLite } from "./AdminSeatsTabs";

interface Props {
  layout: SeatLayout | null;
  students: StudentLite[];
  constraints: SeatConstraint[];
  onChange: (c: SeatConstraint[]) => void;
}

/** 제약조건 관리: 짝 금지 / 인접 금지 / 고정석 */
export default function ConstraintsTab({ layout, students, constraints, onChange }: Props) {
  const supabase = createClient();
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");
  const [pairType, setPairType] = useState<"no_pair" | "no_adjacent">("no_adjacent");
  const [fixedStudent, setFixedStudent] = useState("");
  const [fixedSeat, setFixedSeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameById = new Map(students.map((s) => [s.id, s.name]));

  async function addPairConstraint(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pairA || !pairB || pairA === pairB) {
      setError("서로 다른 두 학생을 선택해 주세요.");
      return;
    }
    const { data, error } = await supabase
      .from("seat_constraints")
      .insert({ type: pairType, student_ids: [pairA, pairB], seat_index: null })
      .select()
      .single();
    if (error || !data) {
      setError(error?.message ?? "추가 실패");
      return;
    }
    onChange([...constraints, data as SeatConstraint]);
    setPairA("");
    setPairB("");
  }

  async function addFixedConstraint() {
    setError(null);
    if (!fixedStudent || fixedSeat === null) {
      setError("학생과 좌석을 모두 선택해 주세요.");
      return;
    }
    const { data, error } = await supabase
      .from("seat_constraints")
      .insert({ type: "fixed", student_ids: [fixedStudent], seat_index: fixedSeat })
      .select()
      .single();
    if (error || !data) {
      setError(error?.message ?? "추가 실패");
      return;
    }
    onChange([...constraints, data as SeatConstraint]);
    setFixedStudent("");
    setFixedSeat(null);
  }

  async function remove(id: number) {
    await supabase.from("seat_constraints").delete().eq("id", id);
    onChange(constraints.filter((c) => c.id !== id));
  }

  const fixedSeatsInUse = new Map(
    constraints
      .filter((c) => c.type === "fixed" && c.seat_index !== null)
      .map((c) => [c.seat_index as number, nameById.get(c.student_ids[0]) ?? "?"])
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 학생 쌍 제약 */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">학생 쌍 제약 추가</h2>
        <form onSubmit={addPairConstraint} className="flex flex-wrap items-center gap-2">
          <select
            aria-label="학생 A"
            value={pairA}
            onChange={(e) => setPairA(e.target.value)}
            className={inputStyles + " w-36"}
          >
            <option value="">학생 A</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="학생 B"
            value={pairB}
            onChange={(e) => setPairB(e.target.value)}
            className={inputStyles + " w-36"}
          >
            <option value="">학생 B</option>
            {students
              .filter((s) => s.id !== pairA)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select
            aria-label="제약 종류"
            value={pairType}
            onChange={(e) => setPairType(e.target.value as "no_pair" | "no_adjacent")}
            className={inputStyles + " w-32"}
          >
            <option value="no_adjacent">인접 금지</option>
            <option value="no_pair">짝 금지</option>
          </select>
          <button type="submit" className={buttonStyles.secondary}>
            추가
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          인접 금지는 짝뿐 아니라 앞뒤·옆자리도 떨어뜨려요.
        </p>
      </Card>

      {/* 고정석 */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">고정석 지정</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            aria-label="고정할 학생"
            value={fixedStudent}
            onChange={(e) => setFixedStudent(e.target.value)}
            className={inputStyles + " w-36"}
          >
            <option value="">학생 선택</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button onClick={addFixedConstraint} className={buttonStyles.secondary}>
            {fixedSeat !== null ? `${fixedSeat + 1}번 좌석에 고정` : "좌석을 선택하세요"}
          </button>
        </div>
        {layout ? (
          <SeatGrid
            rows={layout.rows}
            cols={layout.cols}
            disabledSeats={layout.disabled_seats}
            renderSeat={(i) => {
              const usedBy = fixedSeatsInUse.get(i);
              return (
                <button
                  type="button"
                  onClick={() => !usedBy && setFixedSeat(fixedSeat === i ? null : i)}
                  aria-pressed={fixedSeat === i}
                  aria-label={`좌석 ${i + 1}${usedBy ? ` (${usedBy} 고정)` : ""}`}
                  disabled={Boolean(usedBy)}
                  className="w-full"
                >
                  <SeatBox
                    variant={usedBy ? "fixed" : fixedSeat === i ? "highlight" : "default"}
                  >
                    {usedBy ?? i + 1}
                  </SeatBox>
                </button>
              );
            }}
          />
        ) : (
          <p className="text-sm text-muted">먼저 좌석 설정에서 구조를 저장해 주세요.</p>
        )}
      </Card>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {/* 등록된 제약 목록 */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">등록된 제약조건</h2>
        {constraints.length === 0 ? (
          <EmptyState title="등록된 제약조건이 없어요" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {constraints.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm"
              >
                <Badge
                  color={c.type === "fixed" ? "amber" : c.type === "no_pair" ? "red" : "purple"}
                >
                  {c.type === "fixed" ? "고정석" : c.type === "no_pair" ? "짝 금지" : "인접 금지"}
                </Badge>
                <span className="min-w-0 flex-1 truncate">
                  {c.student_ids.map((id) => nameById.get(id) ?? "?").join(" · ")}
                  {c.type === "fixed" && c.seat_index !== null && ` → ${c.seat_index + 1}번 좌석`}
                </span>
                <button
                  onClick={() => remove(c.id)}
                  aria-label="삭제"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-rose-500"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
