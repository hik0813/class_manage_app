"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, EmptyState, Skeleton, buttonStyles } from "@/components/ui";
import SeatGrid, { SeatBox } from "@/components/seats/SeatGrid";
import Modal from "@/components/ui/Modal";
import type { SeatAssignment, SeatLayout } from "@/lib/database.types";
import type { StudentLite } from "./AdminSeatsTabs";

interface Props {
  layout: SeatLayout | null;
  students: StudentLite[];
  onRestored: (a: SeatAssignment) => void;
}

/** 과거 자리배치 이력 조회 + 복원 */
export default function HistoryTab({ layout, students, onRestored }: Props) {
  const supabase = createClient();
  const [history, setHistory] = useState<SeatAssignment[] | null>(null);
  const [viewing, setViewing] = useState<SeatAssignment | null>(null);

  const nameById = new Map(students.map((s) => [s.id, s.name]));

  useEffect(() => {
    supabase
      .from("seat_assignments")
      .select("*")
      .order("assigned_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setHistory((data ?? []) as SeatAssignment[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restore(a: SeatAssignment) {
    if (!confirm("이 배치를 현재 배치로 복원할까요?")) return;
    await supabase.from("seat_assignments").update({ is_current: false }).eq("is_current", true);
    const { data } = await supabase
      .from("seat_assignments")
      .update({ is_current: true })
      .eq("id", a.id)
      .select()
      .single();
    if (data) {
      const restored = data as SeatAssignment;
      setHistory((prev) =>
        prev?.map((h) => ({ ...h, is_current: h.id === restored.id })) ?? null
      );
      onRestored(restored);
      setViewing(null);
    }
  }

  if (!history) {
    return <Skeleton className="h-60 rounded-2xl" />;
  }

  return (
    <>
      {history.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History size={28} />}
            title="저장된 배치 이력이 없어요"
            description="배치를 확정 저장하면 이력이 쌓여요."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((a) => (
            <li key={a.id}>
              <button onClick={() => setViewing(a)} className="w-full text-left">
                <Card className="flex items-center gap-3 py-3 transition hover:bg-surface-hover">
                  <History size={16} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {new Date(a.assigned_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-xs text-muted">
                    {a.seats.filter(Boolean).length}명
                  </span>
                  {a.is_current && <Badge color="green">현재 배치</Badge>}
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? new Date(viewing.assigned_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }) + " 배치"
            : ""
        }
      >
        {viewing && layout && (
          <div className="flex flex-col gap-4">
            <SeatGrid
              rows={layout.rows}
              cols={layout.cols}
              disabledSeats={layout.disabled_seats}
              renderSeat={(i) => {
                const id = viewing.seats[i];
                return (
                  <SeatBox variant={id ? "default" : "empty"}>
                    {id ? (nameById.get(id) ?? "?") : ""}
                  </SeatBox>
                );
              }}
            />
            {!viewing.is_current && (
              <button onClick={() => restore(viewing)} className={buttonStyles.secondary}>
                <RotateCcw size={15} /> 이 배치로 복원
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
