import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader, AdminLink } from "@/components/ui";
import CalendarView, { type BirthdayEntry } from "@/components/calendar/CalendarView";
import type { ClassEvent } from "@/lib/database.types";

export const metadata = { title: "캘린더" };

export default async function CalendarPage() {
  const supabase = await createClient();

  const [profile, eventsRes, birthdaysRes] = await Promise.all([
    getCurrentProfile(),
    supabase.from("events").select("*").order("date"),
    supabase.from("profiles").select("name, birthday").not("birthday", "is", null),
  ]);

  const events = (eventsRes.data ?? []) as ClassEvent[];
  const birthdays = ((birthdaysRes.data ?? []) as { name: string; birthday: string | null }[])
    .filter((b): b is BirthdayEntry => Boolean(b.birthday));

  return (
    <div>
      <PageHeader
        title="캘린더"
        description="학사일정, 시험, 수행평가, 행사, 생일을 한눈에 확인해요."
        action={profile?.role === "admin" ? <AdminLink href="/admin/events" label="일정 관리" /> : undefined}
      />
      <CalendarView events={events} birthdays={birthdays} />
    </div>
  );
}
