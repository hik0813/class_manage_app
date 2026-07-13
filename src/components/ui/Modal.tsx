"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * 접근성을 갖춘 모달: <dialog> 요소 사용 (ESC 닫기, 포커스 트랩 내장)
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // 배경(backdrop) 클릭 시 닫기
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="rounded-lg p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
