"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** 읽지 않은 알림 개수 배지 (Supabase Realtime으로 실시간 갱신) */
export default function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    const supabase = createClient();

    async function fetchCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setUnread(count ?? 0);
    }
    fetchCount();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        fetchCount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
      className="relative rounded-xl p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
