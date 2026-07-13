/**
 * Supabase 접속 정보. 환경변수가 없어도 빌드가 깨지지 않도록
 * 플레이스홀더를 제공하고, 미설정 여부를 앱에서 감지할 수 있게 한다.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key-placeholder";

export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
