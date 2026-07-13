"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Dices, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { randomizeSeats, shuffle } from "@/lib/seating";
import { cn } from "@/lib/utils";
import { Card, buttonStyles, EmptyState } from "@/components/ui";
import SeatGrid, { SeatBox } from "@/components/seats/SeatGrid";
import type {
  SeatAssignment,
  SeatConstraint,
  SeatLayout,
} from "@/lib/database.types";
import type { StudentLite } from "./AdminSeatsTabs";

interface Props {
  layout: SeatLayout | null;
  students: StudentLite[];
  constraints: SeatConstraint[];
  current: SeatAssignment | null;
  onSaved: (a: SeatAssignment) => void;
}

/** 드래그 가능한 학생 이름표 */
function DraggableSeat({
  seatIndex,
  name,
  isFixed,
  animate,
}: {
  seatIndex: number;
  name: string;
  isFixed: boolean;
  animate: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `seat-${seatIndex}`,
    data: { seatIndex },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={cn("touch-none", isDragging && "relative z-50 opacity-90")}
    >
      <SeatBox
        variant={isFixed ? "fixed" : "default"}
        animate={animate}
        className="cursor-grab active:cursor-grabbing"
      >
        {name}
      </SeatBox>
    </div>
  );
}

/** 드롭 대상 좌석 */
function DroppableSeat({
  seatIndex,
  children,
}: {
  seatIndex: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${seatIndex}`,
    data: { seatIndex },
  });
  return (
    <div ref={setNodeRef} className={cn(isOver && "scale-105 transition-transform")}>
      {children}
    </div>
  );
}

export default function AssignTab({
  layout,
  students,
  constraints,
  current,
  onSaved,
}: Props) {
  const supabase = createClient();
  const [seats, setSeats] = useState<(string | null)[] | null>(current?.seats ?? null);
  const [avoidSamePair, setAvoidSamePair] = useState(true);
  const [sendNotify, setSendNotify] = useState(true);
  const [phase, setPhase] = useState<"idle" | "shuffling" | "done">(
    current ? "done" : "idle"
  );
  const [violations, setViolations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const shuffleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const fixedSeatIndexes = new Set(
    constraints
      .filter((c) => c.type === "fixed" && c.seat_index !== null)
      .map((c) => c.seat_index as number)
  );

  if (!layout) {
    return (
      <Card>
        <EmptyState
          title="먼저 좌석 구조를 설정해 주세요"
          description="좌석 설정 탭에서 줄과 칸 수를 정하면 배치를 실행할 수 있어요."
        />
      </Card>
    );
  }
  if (students.length === 0) {
    return (
      <Card>
        <EmptyState
          title="배치할 학생이 없어요"
          description="학생들이 가입하면 자동으로 명단에 나타나요."
        />
      </Card>
    );
  }

  /** 랜덤 배치 실행: 잠깐 셔플 애니메이션을 보여준 뒤 결과 확정 */
  function runRandomize() {
    if (shuffleTimer.current) clearInterval(shuffleTimer.current);
    setMessage(null);
    setPhase("shuffling");

    const l = layout!;
    const totalSeats = l.rows * l.cols;
    const disabled = new Set(l.disabled_seats);
    const freeSeats = Array.from({ length: totalSeats }, (_, i) => i).filter(
      (i) => !disabled.has(i)
    );

    // 애니메이션: 이름을 무작위로 계속 섞어서 보여준다
    shuffleTimer.current = setInterval(() => {
      const ids = shuffle(students.map((s) => s.id));
      const temp: (string | null)[] = Array(totalSeats).fill(null);
      shuffle(freeSeats).forEach((seatIdx, i) => {
        if (i < ids.length) temp[seatIdx] = ids[i];
      });
      setSeats(temp);
    }, 90);

    // 1.2초 후 실제 알고리즘 결과로 확정
    setTimeout(() => {
      if (shuffleTimer.current) clearInterval(shuffleTimer.current);
      const result = randomizeSeats({
        layout: l,
        students,
        constraints,
        previousSeats: current?.seats ?? null,
        avoidSamePair,
      });
      setSeats(result.seats);
      setViolations(result.violations);
      setPhase("done");
    }, 1200);
  }

  /** 드래그 앤 드롭으로 두 좌석 교환 */
  function handleDragEnd(event: DragEndEvent) {
    const from = event.active.data.current?.seatIndex as number | undefined;
    const to = event.over?.data.current?.seatIndex as number | undefined;
    if (from === undefined || to === undefined || from === to || !seats) return;
    setSeats((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setMessage("자리를 교환했어요. 저장을 눌러야 반영돼요.");
  }

  /** 현재 배치를 확정 저장 (+ 알림) */
  async function save() {
    if (!seats || !layout) return;
    setSaving(true);
    setMessage(null);

    // 기존 현재 배치 해제 후 새 스냅샷 저장 → 이력이 자동으로 쌓인다
    await supabase.from("seat_assignments").update({ is_current: false }).eq("is_current", true);
    const { data, error } = await supabase
      .from("seat_assignments")
      .insert({ layout_id: layout.id, seats, is_current: true })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setMessage(`저장 실패: ${error?.message ?? ""}`);
      return;
    }
    onSaved(data as SeatAssignment);
    setMessage("자리배치를 확정했어요 ✅ 학생 화면에 바로 반영돼요.");

    if (sendNotify) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "seating" }),
      }).catch(() => {});
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runRandomize}
            disabled={phase === "shuffling"}
            className={buttonStyles.primary}
          >
            <Dices size={16} />
            {phase === "shuffling" ? "섞는 중..." : "랜덤 배치 실행"}
          </button>
          <button
            onClick={save}
            disabled={!seats || phase !== "done" || saving}
            className={buttonStyles.secondary}
          >
            <Save size={16} />
            {saving ? "저장 중..." : "배치 확정 저장"}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={avoidSamePair}
              onChange={(e) => setAvoidSamePair(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            직전 배치와 같은 짝 금지
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendNotify}
              onChange={(e) => setSendNotify(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            저장 시 전체 알림
          </label>
        </div>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}
        {violations.length > 0 && (
          <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-semibold">
              ⚠️ 제약을 모두 만족하는 배치를 찾지 못했어요. 드래그로 직접 조정해 주세요.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-5">
        {!seats ? (
          <EmptyState
            title="랜덤 배치 실행을 눌러 시작하세요"
            description={`학생 ${students.length}명 · 좌석 ${
              layout.rows * layout.cols - layout.disabled_seats.length
            }개`}
          />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className={cn(phase === "shuffling" && "pointer-events-none")}>
              <SeatGrid
                rows={layout.rows}
                cols={layout.cols}
                disabledSeats={layout.disabled_seats}
                renderSeat={(i) => {
                  const studentId = seats[i];
                  return (
                    <DroppableSeat seatIndex={i}>
                      {studentId ? (
                        <div className={cn(phase === "shuffling" && "seat-shuffle")}>
                          <DraggableSeat
                            seatIndex={i}
                            name={nameById.get(studentId) ?? "?"}
                            isFixed={fixedSeatIndexes.has(i)}
                            animate={phase === "done"}
                          />
                        </div>
                      ) : (
                        <SeatBox variant="empty">빈자리</SeatBox>
                      )}
                    </DroppableSeat>
                  );
                }}
              />
            </div>
            {phase === "done" && (
              <p className="mt-4 text-center text-xs text-muted">
                이름표를 드래그해서 자리를 바꿀 수 있어요. 노란 자리는 고정석이에요.
              </p>
            )}
          </DndContext>
        )}
      </Card>
    </div>
  );
}
