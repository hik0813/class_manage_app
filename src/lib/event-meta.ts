import type { EventType } from "@/lib/database.types";
import type { BadgeColor } from "@/components/ui";

/** 일정 유형별 라벨/색상 (캘린더 · 디데이 · 대시보드 공용) */
export const EVENT_META: Record<
  EventType,
  { label: string; badge: BadgeColor; dot: string; calBg: string }
> = {
  academic: {
    label: "학사일정",
    badge: "blue",
    dot: "bg-sky-500",
    calBg:
      "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  exam: {
    label: "시험",
    badge: "red",
    dot: "bg-rose-500",
    calBg:
      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  assessment: {
    label: "수행평가",
    badge: "amber",
    dot: "bg-amber-500",
    calBg:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  school_event: {
    label: "학교 행사",
    badge: "green",
    dot: "bg-emerald-500",
    calBg:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export const EVENT_TYPES = Object.keys(EVENT_META) as EventType[];

/** 생일 표시용 (events 테이블이 아닌 profiles.birthday에서 유래) */
export const BIRTHDAY_META = {
  label: "생일",
  badge: "pink" as BadgeColor,
  dot: "bg-pink-500",
  calBg: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
};
