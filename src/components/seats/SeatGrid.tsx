import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * 교실 자리배치 그리드.
 * 칠판이 위쪽이고, 두 자리씩(짝) 붙여서 분단 사이에 통로를 둔다.
 */
export default function SeatGrid({
  rows,
  cols,
  disabledSeats,
  renderSeat,
  className,
}: {
  rows: number;
  cols: number;
  disabledSeats: number[];
  /** 좌석 내용 렌더링. 반환값이 null이면 빈 좌석 */
  renderSeat: (seatIndex: number) => ReactNode;
  className?: string;
}) {
  const disabled = new Set(disabledSeats);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-fit">
        {/* 칠판 */}
        <div className="mx-auto mb-4 flex h-8 w-3/5 min-w-40 items-center justify-center rounded-lg bg-emerald-800/90 text-xs font-medium text-emerald-50 dark:bg-emerald-900">
          칠판
        </div>

        <div
          className="grid justify-center gap-y-2"
          style={{
            // 짝(2자리)마다 통로(1rem) 컬럼을 끼워 넣는다
            gridTemplateColumns: Array.from({ length: cols }, (_, c) => {
              const isAisleAfter = c % 2 === 1 && c < cols - 1;
              return isAisleAfter ? "minmax(0,1fr) 1rem" : "minmax(0,1fr)";
            }).join(" "),
            columnGap: "0.375rem",
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const col = i % cols;
            const cells: ReactNode[] = [];
            if (disabled.has(i)) {
              cells.push(<div key={i} aria-hidden className="min-h-14 min-w-16" />);
            } else {
              cells.push(<div key={i}>{renderSeat(i)}</div>);
            }
            // 통로 자리 채우기
            if (col % 2 === 1 && col < cols - 1) {
              cells.push(<div key={`aisle-${i}`} aria-hidden />);
            }
            return cells;
          })}
        </div>
      </div>
    </div>
  );
}

/** 기본 좌석 칸 스타일 */
export function SeatBox({
  children,
  variant = "default",
  className,
  animate,
}: {
  children: ReactNode;
  variant?: "default" | "empty" | "highlight" | "fixed";
  className?: string;
  animate?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 min-w-16 items-center justify-center rounded-xl border px-1 py-2 text-center text-xs font-medium sm:text-sm",
        variant === "default" && "border-line bg-surface",
        variant === "empty" && "border-dashed border-line bg-background text-muted/50",
        variant === "highlight" &&
          "border-indigo-400 bg-primary-soft font-bold text-indigo-700 ring-2 ring-indigo-500/30 dark:text-indigo-200",
        variant === "fixed" && "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
        animate && "seat-pop",
        className
      )}
    >
      {children}
    </div>
  );
}
