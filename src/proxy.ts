import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * 로그인 없이 접근 가능한 페이지
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth",
  "/timetable",
  "/meals",
  "/calendar",
  "/dday",
  "/notices",
];

/**
 * 인증 미들웨어(proxy)
 * 1. Supabase 세션 갱신
 * 2. 공개 페이지는 로그인 없이 접근 허용
 * 3. 비공개 페이지는 로그인 필요
 * 4. /admin은 관리자만 접근 가능
 */
export async function proxy(request: NextRequest) {
  // Supabase 미설정 상태에서는 그대로 통과
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

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS
      .filter((p) => p !== "/")
      .some((p) => pathname.startsWith(p));

  // 로그인 안 했고 공개 페이지도 아니면 로그인
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시 홈으로
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 관리자만 /admin 접근 가능
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|api/cron).*)",
  ],
};
