"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/lib/suggestion-meta";
import {
  PageHeader,
  Card,
  Badge,
  buttonStyles,
  inputStyles,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import type { Suggestion, SuggestionStatus } from "@/lib/database.types";

type SuggestionWithAuthor = Suggestion & { author: { name: string } | null };

export default function AdminSuggestionsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<SuggestionWithAuthor[] | null>(null);
  const [filter, setFilter] = useState<SuggestionStatus | "all">("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("suggestions")
      .select("*, author:profiles!author_id(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setItems((data ?? []) as unknown as SuggestionWithAuthor[])
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(s: SuggestionWithAuthor, status: SuggestionStatus) {
    await supabase.from("suggestions").update({ status }).eq("id", s.id);
    setItems((prev) =>
      prev?.map((x) => (x.id === s.id ? { ...x, status } : x)) ?? null
    );
  }

  async function sendReply(s: SuggestionWithAuthor) {
    const reply = (replyDrafts[s.id] ?? "").trim();
    if (!reply) return;
    setSavingId(s.id);

    const { error } = await supabase
      .from("suggestions")
      .update({
        reply,
        status: "answered",
        replied_at: new Date().toISOString(),
      })
      .eq("id", s.id);

    if (!error) {
      setItems(
        (prev) =>
          prev?.map((x) =>
            x.id === s.id ? { ...x, reply, status: "answered" as const } : x
          ) ?? null
      );
      setReplyDrafts((d) => ({ ...d, [s.id]: "" }));
      // 작성자에게 답변 알림
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "suggestion_reply",
          userId: s.author_id,
          suggestionId: s.id,
        }),
      }).catch(() => {});
    }
    setSavingId(null);
  }

  const filtered = items?.filter((s) => filter === "all" || s.status === filter);

  return (
    <div>
      <PageHeader title="건의함 관리" description="학생들의 건의를 확인하고 답변해요." />

      {/* 상태 필터 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {(["all", ...STATUS_ORDER] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition",
              filter === key
                ? "bg-indigo-600 text-white"
                : "border border-line text-muted hover:bg-surface-hover"
            )}
          >
            {key === "all" ? "전체" : STATUS_META[key].label}
            {items && (
              <span className="ml-1 opacity-70">
                {key === "all"
                  ? items.length
                  : items.filter((s) => s.status === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {!filtered ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="해당하는 건의가 없어요" />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={STATUS_META[s.status].color}>
                    {STATUS_META[s.status].label}
                  </Badge>
                  <h3 className="min-w-0 flex-1 truncate font-semibold">{s.title}</h3>
                  <span className="text-xs text-muted">
                    {s.is_anonymous ? "익명" : (s.author?.name ?? "알 수 없음")} ·{" "}
                    {timeAgo(s.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{s.content}</p>

                {/* 상태 변경 */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {STATUS_ORDER.map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatus(s, st)}
                      disabled={s.status === st}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                        s.status === st
                          ? "bg-indigo-600 text-white"
                          : "border border-line text-muted hover:bg-surface-hover"
                      )}
                    >
                      {STATUS_META[st].label}
                    </button>
                  ))}
                </div>

                {/* 답변 */}
                {s.reply ? (
                  <div className="mt-3 rounded-xl bg-primary-soft p-3">
                    <p className="mb-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                      내 답변
                    </p>
                    <p className="whitespace-pre-line text-sm">{s.reply}</p>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      placeholder="답변 작성 (등록하면 작성자에게 알림이 가요)"
                      aria-label={`${s.title} 답변`}
                      value={replyDrafts[s.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                      }
                      className={inputStyles + " flex-1"}
                    />
                    <button
                      onClick={() => sendReply(s)}
                      disabled={savingId === s.id || !(replyDrafts[s.id] ?? "").trim()}
                      className={buttonStyles.primary}
                    >
                      {savingId === s.id ? "등록 중..." : "답변 등록"}
                    </button>
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
