"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Card, buttonStyles, inputStyles } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : error.message
      );
      setLoading(false);
      return;
    }

    router.replace(searchParams.get("next") ?? "/");
    router.refresh();
  }

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          아직 Supabase 환경변수가 설정되지 않았습니다.
          <br />
          <code className="text-xs">.env.example</code>을{" "}
          <code className="text-xs">.env.local</code>로 복사하고 프로젝트 값을
          채운 뒤, <code className="text-xs">supabase/schema.sql</code>을
          실행해 주세요.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            이메일
          </label>

          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyles}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            비밀번호
          </label>

          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputStyles}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={buttonStyles.primary}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      {/* 게스트 버튼 */}
      <Link
        href="/"
        className="mt-3 flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        👀 게스트로 둘러보기
      </Link>

      <p className="mt-4 text-center text-sm text-muted">
        아직 계정이 없나요?{" "}
        <Link
          href="/signup"
          className="font-medium text-indigo-500 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
