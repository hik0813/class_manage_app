import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader, Card, EmptyState, AdminLink } from "@/components/ui";
import SeatGrid, { SeatBox } from "@/components/seats/SeatGrid";
import type { Profile, SeatAssignment, SeatLayout } from "@/lib/database.types";

export const metadata = { title: "자리배치" };

export default async function SeatsPage() {
  const supabase = await createClient();

  const [profile, assignmentRes, profilesRes] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("seat_assignments")
      .select("*, layout:seat_layouts(*)")
      .eq("is_current", true)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("id, name"),
  ]);

  const assignment = assignmentRes.data as
    | (SeatAssignment & { layout: SeatLayout | null })
    | null;
  const nameById = new Map(
    ((profilesRes.data ?? []) as Pick<Profile, "id" | "name">[]).map((p) => [p.id, p.name])
  );

  const assignedDate = assignment
    ? new Date(assignment.assigned_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div>
      <PageHeader
        title="자리배치"
        description={assignedDate ? `${assignedDate}에 확정된 자리예요.` : undefined}
        action={profile?.role === "admin" ? <AdminLink href="/admin/seats" label="배치 실행" /> : undefined}
      />

      {!assignment || !assignment.layout ? (
        <Card>
          <EmptyState
            title="아직 확정된 자리배치가 없어요"
            description="선생님이 자리배치를 실행하면 여기에 표시돼요."
          />
        </Card>
      ) : (
        <Card className="p-5">
          <SeatGrid
            rows={assignment.layout.rows}
            cols={assignment.layout.cols}
            disabledSeats={assignment.layout.disabled_seats}
            renderSeat={(i) => {
              const studentId = assignment.seats[i];
              const isMe = studentId != null && studentId === profile?.id;
              return (
                <SeatBox variant={isMe ? "highlight" : studentId ? "default" : "empty"}>
                  {studentId ? (nameById.get(studentId) ?? "?") : "빈자리"}
                </SeatBox>
              );
            }}
          />
          {profile && assignment.seats.includes(profile.id) && (
            <p className="mt-4 text-center text-sm text-muted">
              파란 자리가 <span className="font-semibold text-indigo-500">내 자리</span>예요!
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
