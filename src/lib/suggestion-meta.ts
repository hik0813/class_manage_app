import type { SuggestionStatus } from "@/lib/database.types";
import type { BadgeColor } from "@/components/ui";

/** 건의 상태 라벨/색상 */
export const STATUS_META: Record<SuggestionStatus, { label: string; color: BadgeColor }> = {
  received: { label: "접수", color: "gray" },
  in_review: { label: "검토중", color: "amber" },
  answered: { label: "답변완료", color: "green" },
};

export const STATUS_ORDER: SuggestionStatus[] = ["received", "in_review", "answered"];
