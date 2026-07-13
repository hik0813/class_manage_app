"use client";

import { useEffect, useState } from "react";
import { MessageSquareHeart, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import {
  PageHeader,
  Card,
  Badge,
  buttonStyles,
  inputStyles,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { STATUS_META } from "@/lib/suggestion-meta";
import type { Suggestion } from "@/lib/database.types";

export default function SuggestionsPage() {
  const supabase = createClient();
  const [mine, setMine] = useState<Suggestion[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("suggestions")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });
      setMine((data ?? []) as Suggestion[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("suggestions")
      .insert({
        author_id: user.id,
        is_anonymous: anonymous,
        title: title.trim(),
        content: content.trim(),
      })
      .select()
      .single();

    setSending(false);
    if (error || !data) {
      setError(error?.message ?? "등록에 실패했어요.");
      return;
    }
    setMine((prev) => [data as Suggestion, ...(prev ?? [])]);
    setTitle("");
    setContent("");
    setAnonymous(false);
  }

  return (
    <div>
      <PageHeader
        title="건의함"
        description="반에 바라는 점을 자유롭게 남겨 주세요. 선생님만 볼 수 있어요."
      />

      {/* 작성 폼 */}
      <Card className="mb-5">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            required
            maxLength={100}
            placeholder="제목"
            aria-label="건의 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputStyles}
          />
          <textarea
            required
            rows={4}
            maxLength={2000}
            placeholder="건의 내용을 적어 주세요"
            aria-label="건의 내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={inputStyles}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              익명으로 보내기
            </label>
            <button type="submit" disabled={sending} className={buttonStyles.primary}>
              <Send size={15} /> {sending ? "보내는 중..." : "보내기"}
            </button>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </form>
      </Card>

      {/* 내가 쓴 건의 */}
      <h2 className="mb-2 text-sm font-semibold text-muted">내가 보낸 건의</h2>
      {mine === null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquareHeart size={28} />}
            title="아직 보낸 건의가 없어요"
            description="첫 건의를 남겨 보세요!"
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {mine.map((s) => (
            <li key={s.id}>
              <Card>
                <div className="flex items-center gap-2">
                  <Badge color={STATUS_META[s.status].color}>
                    {STATUS_META[s.status].label}
                  </Badge>
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {s.title}
                  </h3>
                  <span className="shrink-0 text-xs text-muted">
                    {timeAgo(s.created_at)}
                    {s.is_anonymous && " · 익명"}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-muted">{s.content}</p>
                {s.reply && (
                  <div className="mt-3 rounded-xl bg-primary-soft p-3">
                    <p className="mb-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                      선생님 답변
                    </p>
                    <p className="whitespace-pre-line text-sm">{s.reply}</p>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
