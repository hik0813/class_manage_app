"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImagePlus, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import {
  PageHeader,
  Card,
  buttonStyles,
  inputStyles,
  EmptyState,
} from "@/components/ui";
import Modal from "@/components/ui/Modal";
import type { Notice } from "@/lib/database.types";

interface FormState {
  id: number | null;
  title: string;
  content: string;
  is_pinned: boolean;
  images: string[];
  sendPush: boolean;
}

const EMPTY: FormState = {
  id: null,
  title: "",
  content: "",
  is_pinned: false,
  images: [],
  sendPush: true,
};

export default function AdminNoticesPage() {
  const supabase = createClient();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotices((data ?? []) as Notice[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${
      file.name.split(".").pop() ?? "jpg"
    }`;
    const { error } = await supabase.storage
      .from("notice-images")
      .upload(path, file, { contentType: file.type });
    if (error) {
      setError(`이미지 업로드 실패: ${error.message}`);
    } else {
      const { data } = supabase.storage.from("notice-images").getPublicUrl(path);
      setForm((f) => f && { ...f, images: [...f.images, data.publicUrl] });
    }
    setUploading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      is_pinned: form.is_pinned,
      images: form.images,
      ...(form.id === null ? { author_id: user?.id ?? null } : {}),
      updated_at: new Date().toISOString(),
    };

    const query =
      form.id === null
        ? supabase.from("notices").insert(payload).select().single()
        : supabase.from("notices").update(payload).eq("id", form.id).select().single();

    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      setError(error?.message ?? "저장에 실패했어요.");
      return;
    }
    const saved = data as Notice;
    const isNew = form.id === null;
    setNotices((prev) =>
      [saved, ...prev.filter((n) => n.id !== saved.id)].sort(
        (a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) ||
          b.created_at.localeCompare(a.created_at)
      )
    );
    setForm(null);

    // 새 공지 등록 시 푸시 알림 발송 (옵션)
    if (isNew && form.sendPush) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "notice", noticeId: saved.id, title: saved.title }),
      }).catch(() => {});
    }
  }

  async function remove(id: number) {
    if (!confirm("이 공지를 삭제할까요?")) return;
    await supabase.from("notices").delete().eq("id", id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  async function togglePin(n: Notice) {
    const { data } = await supabase
      .from("notices")
      .update({ is_pinned: !n.is_pinned })
      .eq("id", n.id)
      .select()
      .single();
    if (data) {
      setNotices((prev) =>
        prev
          .map((x) => (x.id === n.id ? (data as Notice) : x))
          .sort(
            (a, b) =>
              Number(b.is_pinned) - Number(a.is_pinned) ||
              b.created_at.localeCompare(a.created_at)
          )
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="공지 관리"
        action={
          <button onClick={() => setForm({ ...EMPTY })} className={buttonStyles.primary}>
            <Plus size={16} /> 공지 작성
          </button>
        }
      />

      {notices.length === 0 ? (
        <Card>
          <EmptyState title="공지사항이 없어요" description="첫 공지를 작성해 보세요." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {notices.map((n) => (
            <li key={n.id}>
              <Card className="flex items-center gap-2 py-3">
                <button
                  onClick={() => togglePin(n)}
                  aria-label={n.is_pinned ? "고정 해제" : "상단 고정"}
                  className="rounded-lg p-1.5 transition hover:bg-surface-hover"
                >
                  <Pin
                    size={15}
                    className={
                      n.is_pinned ? "fill-rose-500 text-rose-500" : "text-muted"
                    }
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted">
                    {timeAgo(n.created_at)}
                    {n.images.length > 0 && ` · 이미지 ${n.images.length}장`}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setForm({
                      id: n.id,
                      title: n.title,
                      content: n.content,
                      is_pinned: n.is_pinned,
                      images: n.images,
                      sendPush: false,
                    })
                  }
                  aria-label="수정"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(n.id)}
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

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id === null ? "공지 작성" : "공지 수정"}
      >
        {form && (
          <form onSubmit={save} className="flex flex-col gap-3">
            <input
              required
              placeholder="공지 제목"
              aria-label="제목"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputStyles}
            />
            <textarea
              required
              rows={7}
              placeholder="공지 내용"
              aria-label="내용"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={inputStyles}
            />

            {/* 이미지 첨부 */}
            <div className="flex flex-wrap items-center gap-2">
              {form.images.map((url) => (
                <div key={url} className="relative">
                  <Image
                    src={url}
                    alt="첨부 이미지"
                    width={80}
                    height={80}
                    unoptimized
                    className="h-20 w-20 rounded-xl border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label="이미지 제거"
                    onClick={() =>
                      setForm({ ...form, images: form.images.filter((u) => u !== url) })
                    }
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 p-0.5 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-muted transition hover:bg-surface-hover">
                <ImagePlus size={18} />
                <span className="text-[10px]">{uploading ? "업로드 중" : "추가"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="h-4 w-4 accent-indigo-600"
              />
              상단 고정
            </label>
            {form.id === null && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sendPush}
                  onChange={(e) => setForm({ ...form, sendPush: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                등록하면서 전체 알림 보내기
              </label>
            )}

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className={buttonStyles.secondary}>
                취소
              </button>
              <button type="submit" disabled={saving || uploading} className={buttonStyles.primary}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
