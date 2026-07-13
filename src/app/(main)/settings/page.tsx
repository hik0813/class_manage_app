"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader,
  Card,
  buttonStyles,
  inputStyles,
  Skeleton,
  Badge,
} from "@/components/ui";
import PushSubscribeCard from "@/components/notifications/PushSubscribeCard";
import type { NotificationPrefs, Profile } from "@/lib/database.types";

const PREF_LABELS: Record<keyof NotificationPrefs, string> = {
  notice: "새 공지사항",
  dday: "디데이 임박 (D-3, D-1)",
  suggestion: "건의함 답변",
  seating: "자리배치 변경",
};

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      const p = data as Profile | null;
      if (p) {
        setProfile(p);
        setName(p.name);
        setBirthday(p.birthday ?? "");
        setPrefs(p.notification_prefs);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), birthday: birthday || null })
      .eq("id", profile.id);
    setMessage(error ? `저장 실패: ${error.message}` : "저장했어요 ✅");
  }

  async function togglePref(key: keyof NotificationPrefs) {
    if (!profile || !prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await supabase
      .from("profiles")
      .update({ notification_prefs: next })
      .eq("id", profile.id);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="설정" />

      <div className="flex flex-col gap-4">
        {/* 프로필 */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted">내 프로필</h2>
            {profile?.role === "admin" && <Badge color="indigo">관리자</Badge>}
          </div>
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                이름
              </label>
              <input
                id="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputStyles}
              />
            </div>
            <div>
              <label htmlFor="birthday" className="mb-1 block text-sm font-medium">
                생일
              </label>
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={inputStyles}
              />
              <p className="mt-1 text-xs text-muted">
                등록하면 캘린더에 표시되고, 생일 당일 대시보드에서 축하를 받아요 🎂
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={buttonStyles.primary}>
                저장
              </button>
              {message && <p className="text-sm text-muted">{message}</p>}
            </div>
          </form>
        </Card>

        {/* 푸시 알림 구독 */}
        <PushSubscribeCard />

        {/* 알림 종류별 on/off */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">알림 받을 항목</h2>
          <ul className="flex flex-col gap-1">
            {prefs &&
              (Object.keys(PREF_LABELS) as (keyof NotificationPrefs)[]).map((key) => (
                <li key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">{PREF_LABELS[key]}</span>
                  <button
                    role="switch"
                    aria-checked={prefs[key]}
                    aria-label={PREF_LABELS[key]}
                    onClick={() => togglePref(key)}
                    className={
                      "relative h-6 w-11 rounded-full transition " +
                      (prefs[key] ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600")
                    }
                  >
                    <span
                      className={
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
                        (prefs[key] ? "left-[22px]" : "left-0.5")
                      }
                    />
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
