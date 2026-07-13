"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, buttonStyles } from "@/components/ui";

/** base64url VAPID 공개키 → Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

/** 브라우저 푸시 알림 구독 관리 카드 */
export default function PushSubscribeCard() {
  const [status, setStatus] = useState<Status>("loading");
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
        next = "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        next = sub ? "subscribed" : "unsubscribed";
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function subscribe() {
    try {
      setStatus("loading");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });
      const json = sub.toJSON();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && json.endpoint && json.keys) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
          { onConflict: "endpoint" }
        );
      }
      setStatus("subscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }

  async function unsubscribe() {
    setStatus("loading");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const supabase = createClient();
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("unsubscribed");
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-indigo-600 dark:text-indigo-300">
          <BellRing size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">푸시 알림</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {status === "unsupported" &&
              "이 브라우저는 푸시 알림을 지원하지 않거나, 서버에 VAPID 키가 설정되지 않았어요. 인앱 알림함은 계속 사용할 수 있어요."}
            {status === "denied" &&
              "알림 권한이 차단되어 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요."}
            {status === "subscribed" && "이 기기에서 푸시 알림을 받고 있어요."}
            {status === "unsubscribed" &&
              "새 공지, 디데이 임박, 건의 답변, 자리 변경 알림을 이 기기로 받아요."}
            {status === "loading" && "확인 중..."}
          </p>
          {status === "subscribed" && (
            <button onClick={unsubscribe} className={buttonStyles.secondary + " mt-3"}>
              푸시 알림 끄기
            </button>
          )}
          {status === "unsubscribed" && (
            <button onClick={subscribe} className={buttonStyles.primary + " mt-3"}>
              푸시 알림 켜기
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
