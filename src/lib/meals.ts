import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * NEIS 급식 API 연동.
 * 학교 코드가 설정되어 있으면 NEIS에서 자동 조회하고,
 * 실패하거나 데이터가 없으면 meals 테이블(관리자 수동 입력)로 폴백한다.
 */

const NEIS_ENDPOINT = "https://open.neis.go.kr/hub/mealServiceDietInfo";

interface NeisMealRow {
  MLSV_YMD: string; // 20260302
  DDISH_NM: string; // "보리밥<br/>미역국 (5.6)<br/>..."
  MMEAL_SC_CODE: string; // 2 = 중식
}

/** "보리밥<br/>미역국 (5.6.)" → "보리밥\n미역국" (알레르기 번호 제거) */
function cleanDish(raw: string): string {
  return raw
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/\s*\([0-9.\s]+\)\s*$/g, "").trim())
    .filter(Boolean)
    .join("\n");
}

/** YYYY-MM-DD → YYYYMMDD */
function ymd(dateStr: string): string {
  return dateStr.replaceAll("-", "");
}

/**
 * NEIS에서 기간 내 중식 메뉴 조회.
 * @returns date(YYYY-MM-DD) → 메뉴 텍스트. 실패 시 빈 객체.
 */
export async function fetchNeisMeals(
  from: string,
  to: string
): Promise<Record<string, string>> {
  const office = process.env.NEXT_PUBLIC_NEIS_OFFICE_CODE;
  const school = process.env.NEXT_PUBLIC_NEIS_SCHOOL_CODE;
  if (!office || !school) return {};

  const params = new URLSearchParams({
    ATPT_OFCDC_SC_CODE: office,
    SD_SCHUL_CODE: school,
    MLSV_FROM_YMD: ymd(from),
    MLSV_TO_YMD: ymd(to),
    MMEAL_SC_CODE: "2", // 중식
    Type: "json",
    pSize: "100",
  });
  if (process.env.NEIS_API_KEY) params.set("KEY", process.env.NEIS_API_KEY);

  try {
    const res = await fetch(`${NEIS_ENDPOINT}?${params}`, {
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    if (!res.ok) return {};
    const json = await res.json();
    const rows: NeisMealRow[] | undefined =
      json?.mealServiceDietInfo?.[1]?.row;
    if (!rows) return {};

    const result: Record<string, string> = {};
    for (const row of rows) {
      const d = row.MLSV_YMD;
      const key = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      result[key] = cleanDish(row.DDISH_NM);
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 기간 내 급식 조회: NEIS 자동 조회 + 수동 입력(meals 테이블) 병합.
 * 같은 날짜에 둘 다 있으면 수동 입력이 우선한다.
 */
export async function getMeals(
  supabase: SupabaseClient<Database>,
  from: string,
  to: string
): Promise<Record<string, string>> {
  const [neis, manual] = await Promise.all([
    fetchNeisMeals(from, to),
    supabase.from("meals").select("date, menu").gte("date", from).lte("date", to),
  ]);

  const merged = { ...neis };
  for (const row of manual.data ?? []) {
    merged[row.date] = row.menu;
  }
  return merged;
}
