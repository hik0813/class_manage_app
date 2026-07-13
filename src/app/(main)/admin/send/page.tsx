"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { PageHeader, Card, buttonStyles, inputStyles } from "@/components/ui";

/** 관리자 수동 알림 발송 (인앱 + 푸시) */
export default function AdminSendPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);

    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "custom",
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
      }),
    }).catch(() => null);

    setSending(false);
    if (res?.ok) {
      setMessage("알림을 보냈어요 ✅");
      setTitle("");
      setBody("");
      setLink("");
    } else {
      const err = res ? await res.json().catch(() => null) : null;
      setMessage(err?.error ?? "발송에 실패했어요.");
    }
  }

  return (
    <div>
      <PageHeader
        title="알림 발송"
        description="모든 학생의 인앱 알림함과 푸시(구독자)로 전송돼요."
      />
      <Card>
        <form onSubmit={send} className="flex flex-col gap-3">
          <input
            required
            maxLength={80}
            placeholder="알림 제목"
            aria-label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputStyles}
          />
          <textarea
            rows={3}
            maxLength={300}
            placeholder="알림 내용 (선택)"
            aria-label="내용"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputStyles}
          />
          <input
            placeholder="이동할 경로 (선택, 예: /notices)"
            aria-label="링크"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={inputStyles}
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={sending} className={buttonStyles.primary}>
              <Send size={15} /> {sending ? "보내는 중..." : "전체 발송"}
            </button>
            {message && <p className="text-sm text-muted">{message}</p>}
          </div>
        </form>
      </Card>
    </div>
  );
}
