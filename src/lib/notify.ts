import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NotificationPrefs,
  NotificationType,
} from "@/lib/database.types";

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
}

/** 알림 설정(prefs)에서 해당 종류를 켜 둔 수신자 id 목록 */
export async function getRecipients(
  prefKey: keyof NotificationPrefs,
  options: { only?: string[]; exclude?: string[] } = {}
): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, notification_prefs");
  let users = (data ?? []) as { id: string; notification_prefs: NotificationPrefs }[];

  if (options.only) users = users.filter((u) => options.only!.includes(u.id));
  if (options.exclude) users = users.filter((u) => !options.exclude!.includes(u.id));
  return users.filter((u) => u.notification_prefs?.[prefKey] !== false).map((u) => u.id);
}

/** 인앱 알림함에 알림 저장 */
export async function insertNotifications(
  userIds: string[],
  payload: NotifyPayload
): Promise<void> {
  if (userIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    userIds.map((user_id) => ({
      user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
    }))
  );
}

/** Web Push 발송. VAPID 미설정 시 조용히 건너뜀. 만료된 구독은 정리 */
export async function sendWebPush(
  userIds: string[],
  payload: NotifyPayload
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || userIds.length === 0) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    publicKey,
    privateKey
  );

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.link ?? "/",
  });

  const staleEndpoints: string[] = [];
  await Promise.allSettled(
    (data ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }
}

/** 인앱 알림 + 푸시를 한 번에 */
export async function notifyUsers(
  userIds: string[],
  payload: NotifyPayload
): Promise<void> {
  await Promise.all([
    insertNotifications(userIds, payload),
    sendWebPush(userIds, payload),
  ]);
}
