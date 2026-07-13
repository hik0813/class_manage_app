import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";

/** 관리자 전용 구역 — proxy(미들웨어)에 더해 서버에서 한 번 더 검증 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
