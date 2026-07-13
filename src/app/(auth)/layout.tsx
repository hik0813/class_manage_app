import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
          <GraduationCap size={30} />
        </div>
        <h1 className="text-2xl font-bold">우리반</h1>
        <p className="text-sm text-muted">우리 반의 모든 것, 한 곳에서</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
