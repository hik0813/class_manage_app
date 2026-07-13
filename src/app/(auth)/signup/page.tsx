"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, buttonStyles, inputStyles } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // 트리거가 profiles.name으로 저장
    });

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "이미 가입된 이메일입니다."
          : error.message
      );
      setLoading(false);
      return;
    }

    // 이메일 확인이 꺼져 있으면 세션이 바로 생긴다 → 홈으로
    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm leading-relaxed">
          가입 확인 메일을 보냈습니다. 📮
          <br />
          메일함에서 링크를 눌러 가입을 완료해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-indigo-500 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputStyles}
            placeholder="홍길동 (실명으로 입력)"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputStyles}
            placeholder="6자 이상"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-500">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonStyles.primary}>
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        이미 계정이 있나요?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-500 hover:underline"
        >
          로그인
        </Link>
      </p>
    </Card>
  );
}
