import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import { Card } from "@/components/ui";
import type { Notice } from "@/lib/database.types";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noticeId = Number(id);
  if (!Number.isInteger(noticeId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select("*, author:profiles!author_id(name)")
    .eq("id", noticeId)
    .single();
  if (!data) notFound();
  const notice = data as unknown as Notice & { author: { name: string } | null };
  const authorName = notice.author?.name ?? "선생님";

  return (
    <div>
      <Link
        href="/notices"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={16} /> 공지 목록
      </Link>

      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2">
          {notice.is_pinned && (
            <Pin size={15} className="shrink-0 fill-rose-500 text-rose-500" />
          )}
          <h1 className="text-lg font-bold">{notice.title}</h1>
        </div>
        <p className="mb-4 text-xs text-muted">
          {authorName} · {timeAgo(notice.created_at)}
        </p>

        <div className="whitespace-pre-line text-[15px] leading-relaxed">
          {notice.content}
        </div>

        {notice.images.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            {notice.images.map((url) => (
              <Image
                key={url}
                src={url}
                alt="공지 첨부 이미지"
                width={800}
                height={600}
                className="h-auto w-full rounded-xl border border-line"
                unoptimized
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
