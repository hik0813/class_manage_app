"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Megaphone, Timer, MessageSquareHeart, Armchair } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, cn } from "@/lib/utils";
import { PageHeader, Card, EmptyState, Skeleton, buttonStyles } from "@/components/ui";
import type { AppNotification, NotificationType } from "@/lib/database.types";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  notice: Megaphone,
  dday: Timer,
  suggestion_reply: MessageSquareHeart,
  seating: Armchair,
  etc: Bell,
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as AppNotification[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(n: AppNotification) {
    if (n.is_read) return;
    setItems((prev) =>
      prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
  }

  async function markAllRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setItems((prev) => prev?.map((x) => ({ ...x, is_read: true })) ?? null);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }

  const unreadCount = items?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div>
      <PageHeader
        title="알림"
        description={unreadCount > 0 ? `안 읽은 알림 ${unreadCount}개` : undefined}
        action={
          unreadCount > 0 ? (
            <button onClick={markAllRead} className={buttonStyles.ghost}>
              <CheckCheck size={15} /> 모두 읽음
            </button>
          ) : undefined
        }
      />

      {items === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell size={28} />}
            title="알림이 없어요"
            description="새 공지나 답변이 오면 여기에 쌓여요."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const inner = (
              <Card
                className={cn(
                  "flex items-start gap-3 py-3 transition hover:bg-surface-hover",
                  !n.is_read && "border-indigo-300 bg-primary-soft/40 dark:border-indigo-800"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    n.is_read
                      ? "bg-background text-muted"
                      : "bg-primary-soft text-indigo-600 dark:text-indigo-300"
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.is_read && "font-semibold")}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted/70">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span aria-label="안 읽음" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                )}
              </Card>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} onClick={() => markRead(n)}>
                    {inner}
                  </Link>
                ) : (
                  <button onClick={() => markRead(n)} className="w-full text-left">
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
