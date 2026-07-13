import {
  Home,
  CalendarDays,
  UtensilsCrossed,
  Megaphone,
  Armchair,
  Clock3,
  Timer,
  MessageSquareHeart,
  Bell,
  Settings,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** 데스크톱 사이드바 전체 메뉴 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/timetable", label: "시간표", icon: Clock3 },
  { href: "/meals", label: "급식", icon: UtensilsCrossed },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/dday", label: "디데이", icon: Timer },
  { href: "/notices", label: "공지사항", icon: Megaphone },
  { href: "/seats", label: "자리배치", icon: Armchair },
  { href: "/suggestions", label: "건의함", icon: MessageSquareHeart },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/settings", label: "설정", icon: Settings },
];

/** 모바일 하단 탭 (5개) */
export const TAB_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/notices", label: "공지", icon: Megaphone },
  { href: "/seats", label: "자리", icon: Armchair },
  { href: "/menu", label: "전체", icon: LayoutGrid },
];
