import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import Link from "next/link";

/* ---------- Card ---------- */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-4 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-sm font-semibold text-muted">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
const badgeColors = {
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
} as const;

export type BadgeColor = keyof typeof badgeColors;

export function Badge({
  color = "gray",
  children,
  className,
}: {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeColors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Button 스타일 (링크/버튼 공용 클래스) ---------- */
export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400",
  secondary:
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50",
} as const;

/* ---------- 입력 필드 공용 클래스 ---------- */
export const inputStyles =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-muted/60">{icon}</div>}
      <p className="text-sm font-medium text-muted">{title}</p>
      {description && <p className="text-xs text-muted/70">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* ---------- 관리자 편집 링크 ---------- */
export function AdminLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400"
    >
      {label ?? "관리"}
    </Link>
  );
}
