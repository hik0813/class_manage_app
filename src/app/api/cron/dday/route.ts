import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecipients, notifyUsers } from "@/lib/notify";
import { toDateString, daysUntil } from "@/lib/utils";
import { EVENT_META } from "@/lib/event-meta";
import type { ClassEvent } from "@/lib/database.types";

/**
 * 디데이 임박 알림 크론 (D-3, D-1).
 * Vercel Cron이 매일 아침 호출한다 (vercel.json 참고).
 * Authorization: Bearer <CRON_SECRET> 필요.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const todayStr = toDateString(new Date());

  // 오늘 기준 D-3, D-1인 일정 조회
  const { data } = await admin
    .from("events")
    .select("*")
    .gte("date", todayStr)
    .order("date");
  const events = ((data ?? []) as ClassEvent[]).filter((ev) => {
    const d = daysUntil(ev.date);
    return d === 3 || d === 1;
  });

  if (events.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const recipients = await getRecipients("dday");
  for (const ev of events) {
    const d = daysUntil(ev.date);
    await notifyUsers(recipients, {
      type: "dday",
      title: `⏰ ${ev.title} D-${d}`,
      body: `${EVENT_META[ev.type].label}이(가) ${d}일 남았어요!`,
      link: "/dday",
    });
  }

  return NextResponse.json({ ok: true, sent: events.length });
}
