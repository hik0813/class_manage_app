import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 헬퍼 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 로컬 타임존 기준 YYYY-MM-DD 문자열 (DB date 컬럼과 매칭용) */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * D-day 계산: 오늘부터 목표 날짜까지 남은 일수.
 * 시간 성분을 제거하고 날짜 단위로만 비교한다.
 *  - 반환값 > 0 : D-n (n일 남음)
 *  - 반환값 = 0 : D-day (오늘)
 *  - 반환값 < 0 : 지난 일정
 */
export function daysUntil(dateStr: string, from: Date = new Date()): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** D-day 라벨: D-3 / D-day / 종료 */
export function ddayLabel(days: number): string {
  if (days === 0) return "D-day";
  if (days > 0) return `D-${days}`;
  return `D+${-days}`;
}

/** 2026-03-02 → 3월 2일 (월) */
export function formatKoreanDate(dateStr: string, withWeekday = true): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const base = `${m}월 ${d}일`;
  return withWeekday ? `${base} (${weekdays[date.getDay()]})` : base;
}

/** 상대 시간 표시: 방금 전 / n분 전 / n시간 전 / n일 전 / 날짜 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 요일 인덱스(월=1 ~ 금=5). 주말이면 null */
export function schoolDayOfWeek(date: Date = new Date()): number | null {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5 ? dow : null;
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금"] as const;
