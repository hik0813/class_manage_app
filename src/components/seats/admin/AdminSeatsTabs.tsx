"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  Profile,
  SeatAssignment,
  SeatConstraint,
  SeatLayout,
} from "@/lib/database.types";
import AssignTab from "./AssignTab";
import LayoutEditor from "./LayoutEditor";
import ConstraintsTab from "./ConstraintsTab";
import HistoryTab from "./HistoryTab";
import GroupsTab from "./GroupsTab";

export type StudentLite = Pick<Profile, "id" | "name" | "student_no">;

const TABS = [
  { key: "assign", label: "배치 실행" },
  { key: "layout", label: "좌석 설정" },
  { key: "constraints", label: "제약조건" },
  { key: "history", label: "배치 이력" },
  { key: "groups", label: "모둠 편성" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  initialLayout: SeatLayout | null;
  students: StudentLite[];
  initialConstraints: SeatConstraint[];
  currentAssignment: SeatAssignment | null;
}

export default function AdminSeatsTabs({
  initialLayout,
  students,
  initialConstraints,
  currentAssignment,
}: Props) {
  const [tab, setTab] = useState<TabKey>(initialLayout ? "assign" : "layout");
  const [layout, setLayout] = useState<SeatLayout | null>(initialLayout);
  const [constraints, setConstraints] = useState<SeatConstraint[]>(initialConstraints);
  const [current, setCurrent] = useState<SeatAssignment | null>(currentAssignment);

  return (
    <div>
      {/* 탭 */}
      <div
        role="tablist"
        aria-label="자리배치 관리 탭"
        className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "assign" && (
        <AssignTab
          layout={layout}
          students={students}
          constraints={constraints}
          current={current}
          onSaved={setCurrent}
        />
      )}
      {tab === "layout" && <LayoutEditor layout={layout} onSaved={setLayout} />}
      {tab === "constraints" && (
        <ConstraintsTab
          layout={layout}
          students={students}
          constraints={constraints}
          onChange={setConstraints}
        />
      )}
      {tab === "history" && (
        <HistoryTab layout={layout} students={students} onRestored={setCurrent} />
      )}
      {tab === "groups" && <GroupsTab students={students} />}
    </div>
  );
}
