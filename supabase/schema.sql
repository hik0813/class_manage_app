-- =============================================================
-- 우리반 (통합 학급 웹앱) 데이터베이스 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 실행하세요.
-- =============================================================

-- ---------- ENUM 타입 ----------
create type user_role as enum ('admin', 'student');
create type event_type as enum ('academic', 'exam', 'assessment', 'school_event');
create type suggestion_status as enum ('received', 'in_review', 'answered');
create type notification_type as enum ('notice', 'dday', 'suggestion_reply', 'seating', 'etc');
create type seat_constraint_type as enum ('no_pair', 'no_adjacent', 'fixed');

-- ---------- 프로필 ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role user_role not null default 'student',
  birthday date,
  student_no int,
  notification_prefs jsonb not null default '{"notice": true, "dday": true, "suggestion": true, "seating": true}',
  created_at timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성 (가입 메타데이터의 name 사용)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 관리자 여부 확인 (RLS 정책에서 사용)
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 학생이 자기 role을 admin으로 바꾸는 것을 차단
create or replace function prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception '권한 변경은 관리자만 가능합니다.';
  end if;
  return new;
end;
$$;

create trigger on_profile_role_change
  before update on profiles
  for each row execute function prevent_role_escalation();

-- ---------- 시간표 ----------
create table timetables (
  id bigint generated always as identity primary key,
  day_of_week int not null check (day_of_week between 1 and 5),
  period int not null check (period between 1 and 10),
  subject text not null,
  unique (day_of_week, period)
);

-- 특정 날짜의 임시 시간표(교체 수업)
create table timetable_overrides (
  id bigint generated always as identity primary key,
  date date not null,
  period int not null check (period between 1 and 10),
  subject text not null,
  note text,
  unique (date, period)
);

-- ---------- 급식 (NEIS 실패 시 수동 입력 폴백) ----------
create table meals (
  date date primary key,
  menu text not null
);

-- ---------- 일정 ----------
create table events (
  id bigint generated always as identity primary key,
  type event_type not null,
  title text not null,
  date date not null,
  end_date date,
  description text,
  exam_scope jsonb,  -- [{"subject": "수학", "scope": "1~3단원"}]
  created_at timestamptz not null default now()
);
create index events_date_idx on events (date);

-- ---------- 공지사항 ----------
create table notices (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  images text[] not null default '{}',
  author_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notices_pinned_idx on notices (is_pinned desc, created_at desc);

-- ---------- 자리배치 ----------
create table seat_layouts (
  id bigint generated always as identity primary key,
  name text not null default '기본 배치',
  rows int not null check (rows between 1 and 12),
  cols int not null check (cols between 1 and 12),
  disabled_seats int[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 좌석 배정 스냅샷 (한 건 = 배치 이력 한 건, seats[i] = 학생 id 또는 null)
create table seat_assignments (
  id bigint generated always as identity primary key,
  layout_id bigint not null references seat_layouts (id) on delete cascade,
  seats jsonb not null,
  is_current boolean not null default false,
  assigned_at timestamptz not null default now()
);
create index seat_assignments_current_idx on seat_assignments (is_current, assigned_at desc);

create table seat_constraints (
  id bigint generated always as identity primary key,
  type seat_constraint_type not null,
  student_ids uuid[] not null,
  seat_index int
);

-- ---------- 건의함 ----------
create table suggestions (
  id bigint generated always as identity primary key,
  author_id uuid not null references profiles (id) on delete cascade,
  is_anonymous boolean not null default false,
  title text not null,
  content text not null,
  status suggestion_status not null default 'received',
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- 알림 ----------
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null default '',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, is_read, created_at desc);

create table push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- RLS (Row Level Security)
-- =============================================================
alter table profiles enable row level security;
alter table timetables enable row level security;
alter table timetable_overrides enable row level security;
alter table meals enable row level security;
alter table events enable row level security;
alter table notices enable row level security;
alter table seat_layouts enable row level security;
alter table seat_assignments enable row level security;
alter table seat_constraints enable row level security;
alter table suggestions enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- 프로필: 로그인한 사용자는 전체 열람(이름/생일 표시용), 본인 또는 관리자만 수정
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated
  using (auth.uid() = id or is_admin());

-- 열람 공용 + 관리자 전용 쓰기 패턴
create policy "timetables_select" on timetables for select to authenticated using (true);
create policy "timetables_admin_all" on timetables for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "overrides_select" on timetable_overrides for select to authenticated using (true);
create policy "overrides_admin_all" on timetable_overrides for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "meals_select" on meals for select to authenticated using (true);
create policy "meals_admin_all" on meals for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "events_select" on events for select to authenticated using (true);
create policy "events_admin_all" on events for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "notices_select" on notices for select to authenticated using (true);
create policy "notices_admin_all" on notices for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "seat_layouts_select" on seat_layouts for select to authenticated using (true);
create policy "seat_layouts_admin_all" on seat_layouts for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "seat_assignments_select" on seat_assignments for select to authenticated using (true);
create policy "seat_assignments_admin_all" on seat_assignments for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "seat_constraints_select" on seat_constraints for select to authenticated using (true);
create policy "seat_constraints_admin_all" on seat_constraints for all to authenticated
  using (is_admin()) with check (is_admin());

-- 건의함: 본인 작성 / 본인 또는 관리자만 열람 / 답변·상태 변경은 관리자만
create policy "suggestions_insert_own" on suggestions for insert to authenticated
  with check (auth.uid() = author_id);
create policy "suggestions_select_own_or_admin" on suggestions for select to authenticated
  using (auth.uid() = author_id or is_admin());
create policy "suggestions_admin_update" on suggestions for update to authenticated
  using (is_admin());
create policy "suggestions_admin_delete" on suggestions for delete to authenticated
  using (is_admin() or auth.uid() = author_id);

-- 알림: 본인 것만 열람/읽음 처리, 생성은 관리자(또는 서비스 롤)
create policy "notifications_select_own" on notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "notifications_update_own" on notifications for update to authenticated
  using (auth.uid() = user_id);
create policy "notifications_admin_insert" on notifications for insert to authenticated
  with check (is_admin());

-- 푸시 구독: 본인 것만
create policy "push_own" on push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- Storage: 공지 이미지 버킷
-- =============================================================
insert into storage.buckets (id, name, public) values ('notice-images', 'notice-images', true);

create policy "notice_images_read" on storage.objects for select
  using (bucket_id = 'notice-images');
create policy "notice_images_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'notice-images' and is_admin());
create policy "notice_images_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'notice-images' and is_admin());

-- =============================================================
-- Realtime: 알림 실시간 수신
-- =============================================================
alter publication supabase_realtime add table notifications;
