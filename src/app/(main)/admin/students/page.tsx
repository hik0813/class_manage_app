"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Badge, inputStyles, Skeleton } from "@/components/ui";
import type { Profile, UserRole } from "@/lib/database.types";

/** 학생 관리: 권한 변경, 생일/번호 등록 (관리자 전용) */
export default function AdminStudentsPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: auth }] = await Promise.all([
        supabase.from("profiles").select("*").order("student_no", { ascending: true, nullsFirst: false }),
        supabase.auth.getUser(),
      ]);
      setProfiles((data ?? []) as Profile[]);
      setMyId(auth.user?.id ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(id: string, patch: Partial<Profile>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("profiles").update(patch).eq("id", id);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="학생 관리"
        description="번호·생일을 입력하고 필요하면 관리자 권한을 부여해요. 자리배치 명단은 여기 등록된 학생 기준이에요."
      />
      <ul className="flex flex-col gap-2">
        {profiles.map((p) => (
          <li key={p.id}>
            <Card className="flex flex-wrap items-center gap-3 py-3">
              <input
                type="number"
                min={1}
                max={99}
                placeholder="번호"
                aria-label={`${p.name} 번호`}
                value={p.student_no ?? ""}
                onChange={(e) =>
                  update(p.id, {
                    student_no: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={inputStyles + " w-16 px-2 text-center"}
              />
              <span className="min-w-24 flex-1 font-medium">
                {p.name}
                {p.id === myId && <span className="ml-1 text-xs text-muted">(나)</span>}
              </span>
              <input
                type="date"
                aria-label={`${p.name} 생일`}
                value={p.birthday ?? ""}
                onChange={(e) => update(p.id, { birthday: e.target.value || null })}
                className={inputStyles + " w-40"}
              />
              <select
                aria-label={`${p.name} 권한`}
                value={p.role}
                disabled={p.id === myId}
                onChange={(e) => update(p.id, { role: e.target.value as UserRole })}
                className={inputStyles + " w-24"}
              >
                <option value="student">학생</option>
                <option value="admin">관리자</option>
              </select>
              {p.role === "admin" && <Badge color="indigo">관리자</Badge>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
