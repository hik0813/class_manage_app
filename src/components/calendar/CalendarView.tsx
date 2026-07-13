"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Cake } from "lucide-react";
import { toDateString, formatKoreanDate, cn } from "@/lib/utils";
import { EVENT_META, BIRTHDAY_META } from "@/lib/event-meta";
import { Badge } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import type { ClassEvent } from "@/lib/database.types";

export interface BirthdayEntry {
  name: string;
  birthday: string; // YYYY-MM-DD (연도는 무시하고 월-일만 사용)
}

interface DayItem {
  kind: "event" | "birthday";
  event?: ClassEvent;
  name?: string;
}

interface Props {
  events: ClassEvent[];
  birthdays: BirthdayEntry[];
}

const WEEK_HEADER = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({ events, birthdays }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<string | null>(null);

  /** 날짜(YYYY-MM-DD) → 그 날의 일정/생일 목록 */
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (key: string, item: DayItem) => {
      map.set(key, [...(map.get(key) ?? []), item]);
    };

    for (const ev of events) {
      // 기간 일정(end_date 존재)은 기간 내 모든 날짜에 표시
      if (ev.end_date && ev.end_date > ev.date) {
        const [y, m, d] = ev.date.split("-").map(Number);
        const cursor = new Date(y, m - 1, d);
        while (toDateString(cursor) <= ev.end_date) {
          push(toDateString(cursor), { kind: "event", event: ev });
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        push(ev.date, { kind: "event", event: ev });
      }
    }

    // 생일은 표시 중인 연도로 투영해서 매핑
    for (const b of birthdays) {
      const mmdd = b.birthday.slice(5);
      push(`${year}-${mmdd}`, { kind: "birthday", name: b.name });
    }
    return map;
  }, [events, birthdays, year]);

  /** 달력 그리드: 앞뒤 빈 칸 포함 날짜 배열 */
  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: (string | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(toDateString(new Date(year, month, d)));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [year, month]);

  function moveMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const todayStr = toDateString(today);
  const selectedItems = selected ? (itemsByDate.get(selected) ?? []) : [];

  return (
    <div>
      {/* 월 이동 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => moveMonth(-1)}
          aria-label="이전 달"
          className="rounded-xl p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={() => moveMonth(1)}
          aria-label="다음 달"
          className="rounded-xl p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 범례 */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {Object.values(EVENT_META).map((m) => (
          <span key={m.label} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", m.dot)} />
            {m.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full", BIRTHDAY_META.dot)} />
          생일
        </span>
      </div>

      {/* 달력 그리드 */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEK_HEADER.map((w, i) => (
            <div
              key={w}
              className={cn(
                "py-2 text-center text-xs font-semibold",
                i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-muted"
              )}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const items = date ? (itemsByDate.get(date) ?? []) : [];
            const isToday = date === todayStr;
            const dow = i % 7;
            return (
              <button
                key={i}
                disabled={!date}
                onClick={() => date && items.length > 0 && setSelected(date)}
                className={cn(
                  "flex min-h-16 flex-col items-stretch gap-0.5 border-b border-r border-line p-1 text-left align-top transition last:border-r-0 sm:min-h-20 [&:nth-child(7n)]:border-r-0",
                  date && items.length > 0 && "cursor-pointer hover:bg-surface-hover",
                  !date && "bg-background/50"
                )}
              >
                {date && (
                  <>
                    <span
                      className={cn(
                        "mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-xs font-semibold",
                        isToday && "bg-indigo-600 text-white",
                        !isToday && dow === 0 && "text-rose-500",
                        !isToday && dow === 6 && "text-sky-500"
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {items.slice(0, 2).map((item, j) => (
                      <span
                        key={j}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
                          item.kind === "birthday"
                            ? BIRTHDAY_META.calBg
                            : EVENT_META[item.event!.type].calBg
                        )}
                      >
                        {item.kind === "birthday" ? `🎂 ${item.name}` : item.event!.title}
                      </span>
                    ))}
                    {items.length > 2 && (
                      <span className="px-1 text-[10px] text-muted">
                        +{items.length - 2}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 일정 상세 모달 */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatKoreanDate(selected) : ""}
      >
        <ul className="flex flex-col gap-3">
          {selectedItems.map((item, i) =>
            item.kind === "birthday" ? (
              <li key={i} className="flex items-center gap-2">
                <Cake size={18} className="text-pink-500" />
                <span className="font-medium">{item.name}님의 생일</span>
                <Badge color="pink">생일</Badge>
              </li>
            ) : (
              <li key={i} className="rounded-xl bg-background p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge color={EVENT_META[item.event!.type].badge}>
                    {EVENT_META[item.event!.type].label}
                  </Badge>
                  <span className="font-semibold">{item.event!.title}</span>
                </div>
                {item.event!.end_date && (
                  <p className="text-xs text-muted">
                    {formatKoreanDate(item.event!.date)} ~{" "}
                    {formatKoreanDate(item.event!.end_date)}
                  </p>
                )}
                {item.event!.description && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted">
                    {item.event!.description}
                  </p>
                )}
                {/* 시험 범위 */}
                {item.event!.exam_scope && item.event!.exam_scope.length > 0 && (
                  <div className="mt-2 rounded-lg border border-line p-2">
                    <p className="mb-1 text-xs font-semibold text-muted">시험 범위</p>
                    <ul className="flex flex-col gap-0.5 text-sm">
                      {item.event!.exam_scope.map((s, k) => (
                        <li key={k}>
                          <span className="font-medium">{s.subject}</span>
                          <span className="text-muted"> — {s.scope}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      </Modal>
    </div>
  );
}
