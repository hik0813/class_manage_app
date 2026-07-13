/**
 * Supabase 데이터베이스 타입 정의.
 * supabase/schema.sql 과 1:1로 대응한다.
 */

export type UserRole = "admin" | "student";
export type EventType = "academic" | "exam" | "assessment" | "school_event";
export type SuggestionStatus = "received" | "in_review" | "answered";
export type NotificationType =
  | "notice"
  | "dday"
  | "suggestion_reply"
  | "seating"
  | "etc";
export type SeatConstraintType = "no_pair" | "no_adjacent" | "fixed";

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  birthday: string | null; // YYYY-MM-DD
  student_no: number | null;
  notification_prefs: NotificationPrefs;
  created_at: string;
}

export type NotificationPrefs = {
  notice: boolean;
  dday: boolean;
  suggestion: boolean;
  seating: boolean;
}

export type TimetableCell = {
  id: number;
  day_of_week: number; // 1(월) ~ 5(금)
  period: number; // 1교시 ~
  subject: string;
}

export type TimetableOverride = {
  id: number;
  date: string; // YYYY-MM-DD
  period: number;
  subject: string;
  note: string | null;
}

export type Meal = {
  date: string; // YYYY-MM-DD (PK)
  menu: string;
}

/** 과목별 시험 범위: [{ subject: "수학", scope: "1단원~3단원" }] */
export type ExamScopeItem = {
  subject: string;
  scope: string;
}

export type ClassEvent = {
  id: number;
  type: EventType;
  title: string;
  date: string; // YYYY-MM-DD
  end_date: string | null;
  description: string | null;
  exam_scope: ExamScopeItem[] | null;
  created_at: string;
}

export type Notice = {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  images: string[];
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SeatLayout = {
  id: number;
  name: string;
  rows: number;
  cols: number;
  disabled_seats: number[]; // 사용하지 않는 좌석 인덱스
  created_at: string;
}

/** 좌석 배정 스냅샷 한 건 = 배치 이력 한 건 */
export type SeatAssignment = {
  id: number;
  layout_id: number;
  /** seat_index → student_id 매핑. 배열 인덱스가 좌석 번호 */
  seats: (string | null)[];
  is_current: boolean;
  assigned_at: string;
}

export type SeatConstraint = {
  id: number;
  type: SeatConstraintType;
  student_ids: string[];
  seat_index: number | null; // fixed 전용
}

export type Suggestion = {
  id: number;
  author_id: string;
  is_anonymous: boolean;
  title: string;
  content: string;
  status: SuggestionStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export type AppNotification = {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export type PushSubscriptionRow = {
  id: number;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

/* ---- Supabase 제네릭 Database 타입 ---- */

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      timetables: TableDef<TimetableCell>;
      timetable_overrides: TableDef<TimetableOverride>;
      meals: TableDef<Meal>;
      events: TableDef<ClassEvent>;
      notices: TableDef<Notice>;
      seat_layouts: TableDef<SeatLayout>;
      seat_assignments: TableDef<SeatAssignment>;
      seat_constraints: TableDef<SeatConstraint>;
      suggestions: TableDef<Suggestion>;
      notifications: TableDef<AppNotification>;
      push_subscriptions: TableDef<PushSubscriptionRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      event_type: EventType;
      suggestion_status: SuggestionStatus;
      notification_type: NotificationType;
      seat_constraint_type: SeatConstraintType;
    };
    CompositeTypes: Record<string, never>;
  };
}
