import Link from "next/link";
import {
  Clock3,
  UtensilsCrossed,
  CalendarDays,
  Megaphone,
  Armchair,
  MessageSquareHeart,
  Send,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "관리 콘솔" };

const ADMIN_MENUS = [
  { href: "/admin/timetable", label: "시간표 편집", desc: "주간 시간표 · 교체 수업", icon: Clock3 },
  { href: "/admin/meals", label: "급식 입력", desc: "NEIS 실패 시 수동 입력", icon: UtensilsCrossed },
  { href: "/admin/events", label: "일정 관리", desc: "학사 · 시험 · 수행 · 행사", icon: CalendarDays },
  { href: "/admin/notices", label: "공지 관리", desc: "작성 · 고정 · 이미지 첨부", icon: Megaphone },
  { href: "/admin/seats", label: "자리배치", desc: "랜덤 배치 · 제약조건 · 이력", icon: Armchair },
  { href: "/admin/suggestions", label: "건의함 관리", desc: "열람 · 상태 변경 · 답변", icon: MessageSquareHeart },
  { href: "/admin/students", label: "학생 관리", desc: "권한 · 생일 · 번호", icon: Users },
  { href: "/admin/send", label: "알림 발송", desc: "전체 공지 푸시 보내기", icon: Send },
];

export default function AdminHomePage() {
  return (
    <div>
      <PageHeader
        title="관리 콘솔"
        description="학급 콘텐츠를 관리하는 선생님 전용 공간입니다."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADMIN_MENUS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:bg-surface-hover"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-indigo-600 dark:text-indigo-300">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="truncate text-sm text-muted">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
