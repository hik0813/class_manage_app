import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

/**
 * 인증 미들웨어(proxy):
 * 1. Supabase 세션 토큰 갱신
 * 2. 비로그인 사용자 → /login 리다이렉트
 * 3. 학생의 /admin 접근 차단 (DB의 RLS로도 이중 방어됨)
 */
export async function proxy(request: NextRequest) {
  // Supabase 미설정 상태(로컬 초기 세팅 전)에는 통과시켜 안내 화면을 보여준다.
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublic && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 관리자 전용 구역 보호
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 정적 파일과 공개 API(cron, push 수신)를 제외한 모든 경로에 적용
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|api/cron).*)",
  ],
};
