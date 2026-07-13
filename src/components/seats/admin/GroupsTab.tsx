"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { makeGroups, type Student } from "@/lib/seating";
import { Card, buttonStyles, inputStyles, EmptyState } from "@/components/ui";
import type { StudentLite } from "./AdminSeatsTabs";

/** 모둠 자동 편성: 모둠 수를 입력하면 랜덤으로 나눈다 */
export default function GroupsTab({ students }: { students: StudentLite[] }) {
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState<Student[][] | null>(null);
  const [animKey, setAnimKey] = useState(0);

  function run() {
    setGroups(makeGroups(students, Math.max(1, Math.min(students.length, groupCount))));
    setAnimKey((k) => k + 1); // 재실행 시 애니메이션 다시 재생
  }

  if (students.length === 0) {
    return (
      <Card>
        <EmptyState title="편성할 학생이 없어요" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="groupCount" className="mb-1 block text-xs text-muted">
              모둠 수
            </label>
            <input
              id="groupCount"
              type="number"
              min={1}
              max={students.length}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value))}
              className={inputStyles + " w-24"}
            />
          </div>
          <button onClick={run} className={buttonStyles.primary}>
            <Shuffle size={16} /> 모둠 짜기
          </button>
          <p className="text-sm text-muted">
            학생 {students.length}명 → 모둠당 약{" "}
            {Math.ceil(students.length / Math.max(1, groupCount))}명
          </p>
        </div>
      </Card>

      {groups && (
        <div key={animKey} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <Card key={i} className="seat-pop">
              <h3 className="mb-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                {i + 1}모둠 <span className="font-normal text-muted">({group.length}명)</span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {group.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg bg-background px-2.5 py-1 text-sm font-medium"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
