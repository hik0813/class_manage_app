import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-6 text-sm leading-relaxed">
          <h1 className="mb-2 text-lg font-bold">초기 설정이 필요합니다</h1>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Supabase 프로젝트를 만듭니다.</li>
            <li>
              <code>supabase/schema.sql</code>을 SQL Editor에서 실행합니다.
            </li>
            <li>
              <code>.env.example</code>을 <code>.env.local</code>로 복사하고
              값을 채웁니다.
            </li>
            <li>개발 서버를 다시 시작합니다.</li>
          </ol>
        </div>
      </main>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    profile = await getCurrentProfile();
  }

  return (
    <AppShell
      userName={profile?.name ?? "게스트"}
      userId={profile?.id ?? ""}
      isAdmin={profile?.role === "admin"}
    >
      {children}
    </AppShell>
  );
}
