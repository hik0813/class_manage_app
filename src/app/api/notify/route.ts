import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRecipients, notifyUsers } from "@/lib/notify";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("notice"),
    noticeId: z.number(),
    title: z.string().min(1),
  }),
  z.object({ kind: z.literal("seating") }),
  z.object({
    kind: z.literal("suggestion_reply"),
    userId: z.string().uuid(),
    suggestionId: z.number(),
  }),
  z.object({
    kind: z.literal("custom"),
    title: z.string().min(1),
    body: z.string(),
    link: z.string().nullable(),
  }),
]);

/**
 * 알림 발송 (관리자 전용).
 * 인앱 알림함 저장 + Web Push 발송을 함께 처리한다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "관리자만 발송할 수 있습니다." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    switch (input.kind) {
      case "notice": {
        const recipients = await getRecipients("notice", { exclude: [user.id] });
        await notifyUsers(recipients, {
          type: "notice",
          title: "새 공지사항",
          body: input.title,
          link: `/notices/${input.noticeId}`,
        });
        break;
      }
      case "seating": {
        const recipients = await getRecipients("seating", { exclude: [user.id] });
        await notifyUsers(recipients, {
          type: "seating",
          title: "자리배치가 변경되었어요",
          body: "새 자리를 확인해 보세요!",
          link: "/seats",
        });
        break;
      }
      case "suggestion_reply": {
        const recipients = await getRecipients("suggestion", { only: [input.userId] });
        await notifyUsers(recipients, {
          type: "suggestion_reply",
          title: "건의에 답변이 달렸어요",
          body: "선생님의 답변을 확인해 보세요.",
          link: "/suggestions",
        });
        break;
      }
      case "custom": {
        const recipients = await getRecipients("notice", { exclude: [user.id] });
        await notifyUsers(recipients, {
          type: "etc",
          title: input.title,
          body: input.body,
          link: input.link,
        });
        break;
      }
    }
  } catch (err) {
    console.error("notify error", err);
    return NextResponse.json({ error: "알림 발송 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
