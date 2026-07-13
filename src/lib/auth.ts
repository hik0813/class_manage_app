import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { redirect } from "next/navigation";

/** 현재 로그인 사용자의 프로필. 없으면 null */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
}

/** 관리자 확인. 아니면 홈으로 리다이렉트 (admin 페이지 이중 방어용) */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}
