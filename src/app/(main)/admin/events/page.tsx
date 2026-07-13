"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDate } from "@/lib/utils";
import { EVENT_META, EVENT_TYPES } from "@/lib/event-meta";
import {
  PageHeader,
  Card,
  Badge,
  buttonStyles,
  inputStyles,
  EmptyState,
} from "@/components/ui";
import Modal from "@/components/ui/Modal";
import type { ClassEvent, EventType, ExamScopeItem } from "@/lib/database.types";

interface FormState {
  id: number | null;
  type: EventType;
  title: string;
  date: string;
  end_date: string;
  description: string;
  exam_scope: ExamScopeItem[];
}

const EMPTY_FORM: FormState = {
  id: null,
  type: "academic",
  title: "",
  date: "",
  end_date: "",
  description: "",
  exam_scope: [],
};

export default function AdminEventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .order("date")
      .then(({ data }) => setEvents((data ?? []) as ClassEvent[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(ev?: ClassEvent) {
    setError(null);
    setForm(
      ev
        ? {
            id: ev.id,
            type: ev.type,
            title: ev.title,
            date: ev.date,
            end_date: ev.end_date ?? "",
            description: ev.description ?? "",
            exam_scope: ev.exam_scope ?? [],
          }
        : { ...EMPTY_FORM }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    const payload = {
      type: form.type,
      title: form.title.trim(),
      date: form.date,
      end_date: form.end_date || null,
      description: form.description.trim() || null,
      exam_scope:
        form.type === "exam" || form.type === "assessment"
          ? form.exam_scope.filter((s) => s.subject.trim())
          : null,
    };

    const query =
      form.id === null
        ? supabase.from("events").insert(payload).select().single()
        : supabase.from("events").update(payload).eq("id", form.id).select().single();

    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      setError(error?.message ?? "저장에 실패했어요.");
      return;
    }
    const saved = data as ClassEvent;
    setEvents((prev) =>
      [...prev.filter((ev) => ev.id !== saved.id), saved].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    await supabase.from("events").delete().eq("id", id);
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="일정 관리"
        description="캘린더와 디데이에 표시되는 일정을 관리해요."
        action={
          <button onClick={() => openEdit()} className={buttonStyles.primary}>
            <Plus size={16} /> 일정 추가
          </button>
        }
      />

      {events.length === 0 ? (
        <Card>
          <EmptyState title="등록된 일정이 없어요" description="일정 추가 버튼으로 첫 일정을 만들어 보세요." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev) => (
            <li key={ev.id}>
              <Card className="flex items-center gap-3 py-3">
                <Badge color={EVENT_META[ev.type].badge}>{EVENT_META[ev.type].label}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ev.title}</p>
                  <p className="text-xs text-muted">
                    {formatKoreanDate(ev.date)}
                    {ev.end_date && ` ~ ${formatKoreanDate(ev.end_date)}`}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(ev)}
                  aria-label="수정"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(ev.id)}
                  aria-label="삭제"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-rose-500"
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* 추가/수정 모달 */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id === null ? "일정 추가" : "일정 수정"}
      >
        {form && (
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={
                    form.type === t
                      ? "rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-xl border border-line px-3 py-1.5 text-sm text-muted hover:bg-surface-hover"
                  }
                >
                  {EVENT_META[t].label}
                </button>
              ))}
            </div>

            <input
              required
              placeholder="일정 제목"
              aria-label="제목"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputStyles}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted">시작일</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">종료일 (선택)</label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className={inputStyles}
                />
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="설명 (선택)"
              aria-label="설명"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputStyles}
            />

            {/* 시험/수행평가일 때 과목별 범위 입력 */}
            {(form.type === "exam" || form.type === "assessment") && (
              <div className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted">과목별 시험 범위</p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        exam_scope: [...form.exam_scope, { subject: "", scope: "" }],
                      })
                    }
                    className="text-xs font-medium text-indigo-500 hover:underline"
                  >
                    + 과목 추가
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.exam_scope.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        placeholder="과목"
                        aria-label={`과목 ${i + 1}`}
                        value={s.subject}
                        onChange={(e) => {
                          const next = [...form.exam_scope];
                          next[i] = { ...next[i], subject: e.target.value };
                          setForm({ ...form, exam_scope: next });
                        }}
                        className={inputStyles + " basis-1/3"}
                      />
                      <input
                        placeholder="범위 (예: 1~3단원)"
                        aria-label={`범위 ${i + 1}`}
                        value={s.scope}
                        onChange={(e) => {
                          const next = [...form.exam_scope];
                          next[i] = { ...next[i], scope: e.target.value };
                          setForm({ ...form, exam_scope: next });
                        }}
                        className={inputStyles + " flex-1"}
                      />
                      <button
                        type="button"
                        aria-label="과목 삭제"
                        onClick={() =>
                          setForm({
                            ...form,
                            exam_scope: form.exam_scope.filter((_, j) => j !== i),
                          })
                        }
                        className="shrink-0 rounded-lg p-2 text-muted hover:text-rose-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {form.exam_scope.length === 0 && (
                    <p className="text-xs text-muted/70">
                      과목 추가를 눌러 시험 범위를 입력하세요.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className={buttonStyles.secondary}>
                취소
              </button>
              <button type="submit" disabled={saving} className={buttonStyles.primary}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
