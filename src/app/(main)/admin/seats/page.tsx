import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import AdminSeatsTabs from "@/components/seats/admin/AdminSeatsTabs";
import type {
  Profile,
  SeatAssignment,
  SeatConstraint,
  SeatLayout,
} from "@/lib/database.types";

export const metadata = { title: "자리배치 관리" };

export default async function AdminSeatsPage() {
  const supabase = await createClient();

  const [layoutRes, studentsRes, constraintsRes, currentRes] = await Promise.all([
    supabase
      .from("seat_layouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, name, student_no")
      .eq("role", "student")
      .order("student_no", { ascending: true, nullsFirst: false }),
    supabase.from("seat_constraints").select("*"),
    supabase
      .from("seat_assignments")
      .select("*")
      .eq("is_current", true)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader
        title="자리배치 관리"
        description="좌석 구조를 설정하고, 제약조건과 함께 랜덤 배치를 실행해요."
      />
      <AdminSeatsTabs
        initialLayout={(layoutRes.data as SeatLayout | null) ?? null}
        students={
          (studentsRes.data ?? []) as Pick<Profile, "id" | "name" | "student_no">[]
        }
        initialConstraints={(constraintsRes.data ?? []) as SeatConstraint[]}
        currentAssignment={(currentRes.data as SeatAssignment | null) ?? null}
      />
    </div>
  );
}
