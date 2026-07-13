import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "@/lib/database.types";

/** 서버 컴포넌트/서버 액션/라우트 핸들러용 Supabase 클라이언트 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // 서버 컴포넌트에서 호출되면 쿠키 쓰기가 불가능하다.
          // 세션 갱신은 proxy(미들웨어)에서 처리되므로 무시해도 된다.
        }
      },
    },
  });
}
