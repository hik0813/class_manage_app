import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";
import type { Database } from "@/lib/database.types";

/**
 * 서비스 롤 키를 사용하는 관리자 클라이언트 (RLS 우회).
 * 알림 발송 등 서버 전용 작업에만 사용하고, 절대 클라이언트로 노출하지 않는다.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
  }
  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
