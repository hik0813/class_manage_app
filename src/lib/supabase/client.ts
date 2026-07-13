"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "@/lib/database.types";

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
