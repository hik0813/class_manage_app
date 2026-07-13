# 우리반 — 통합 학급 웹앱 🏫

학급 공지, 시간표, 급식, 캘린더, 디데이, 자리배치, 건의함, 알림까지 —
학급 운영에 필요한 모든 것을 하나로 모은 PWA 웹앱입니다.
실제 학급에서 학생들이 매일 스마트폰으로 사용하는 것을 전제로 만들었습니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 홈 대시보드 | 오늘의 시간표(요일 자동 감지) · 급식 · 날씨 · 임박한 디데이 · 최근 공지 · 생일 축하 배너 |
| 시간표 | 주간 시간표 + 오늘 하이라이트, 관리자 편집, 특정 날짜 교체 수업 |
| 급식 | NEIS 교육청 급식 API 자동 조회, 실패 시 관리자 수동 입력 폴백 |
| 캘린더 | 월간 뷰, 유형별 색상(학사/시험/수행/행사/생일), 과목별 시험 범위, 상세 모달 |
| 디데이 | 모든 일정 자동 D-day 계산, 가까운 순 정렬, 지난 일정 접힘 |
| 공지사항 | 상단 고정, 이미지 첨부(Storage), 공지+일정 통합 검색, 등록 시 푸시 발송 옵션 |
| 자리배치 | 교실 구조 시각화(분단·줄 설정), 셔플 애니메이션 랜덤 배치, 제약조건(같은 짝 금지·인접 금지·고정석), 드래그 앤 드롭 수동 조정, 배치 이력/복원, 모둠 자동 편성 |
| 건의함 | 익명 옵션, 관리자 상태 관리(접수/검토중/답변완료), 답변 시 작성자 알림 |
| 알림 | 인앱 알림함(실시간 배지) + Web Push(서비스 워커), 종류별 on/off, 디데이 D-3/D-1 자동 푸시(크론) |
| 공통 | 다크모드(시스템 감지+수동 토글), 모바일 하단 탭/데스크톱 사이드바, PWA 설치·오프라인 캐시, 스켈레톤/빈 상태 처리 |

## 기술 스택

- **Next.js** (App Router) + **TypeScript**(strict) + **Tailwind CSS v4**
- **Supabase** — PostgreSQL · Auth · Realtime · Storage, **RLS로 권한을 DB 레벨에서 강제**
- **Web Push API** — 서비스 워커 + VAPID
- **Vercel** 배포 (+ Vercel Cron으로 디데이 알림)

## 시작하기

### 1. Supabase 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql) 실행 (테이블 + RLS + 트리거 + Storage 버킷)
3. (선택) [`supabase/seed.sql`](supabase/seed.sql) 실행 — 데모용 시간표/일정/공지
4. Authentication > Providers > Email에서 필요 시 **Confirm email 비활성화** (학급 내부용이면 끄는 게 편해요)

### 2. 환경변수

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 (서버 전용 — 알림 발송에 사용) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 키 (`npx web-push generate-vapid-keys`로 생성) |
| `VAPID_SUBJECT` | `mailto:` 형식 연락처 |
| `NEIS_API_KEY` | NEIS 인증키 (선택 — 없어도 소량 조회 가능) |
| `NEXT_PUBLIC_NEIS_OFFICE_CODE` | 시도교육청 코드 (서울 `B10`, 경기 `J10` 등) |
| `NEXT_PUBLIC_NEIS_SCHOOL_CODE` | 학교 행정표준코드 ([나이스 학교 검색](https://open.neis.go.kr)) |
| `NEXT_PUBLIC_WEATHER_LAT` / `LON` | 학교 위치 좌표 (Open-Meteo, 키 불필요) |
| `CRON_SECRET` | 디데이 크론 보호용 임의 문자열 |

### 3. 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속 → 회원가입 → 첫 사용자를 관리자로 승격:

```sql
-- Supabase SQL Editor에서
update profiles set role = 'admin' where name = '본인 이름';
```

이후에는 관리 콘솔 > 학생 관리에서 UI로 권한을 바꿀 수 있습니다.

## 배포 (Vercel)

1. 저장소를 Vercel에 연결하고 위 환경변수를 모두 등록
2. `vercel.json`의 크론(`0 22 * * *` UTC = 매일 07:00 KST)이 디데이 D-3/D-1 푸시를 자동 발송
   — Vercel이 `CRON_SECRET`을 Authorization 헤더로 자동 전달합니다
3. 배포 후 HTTPS 환경에서 PWA 설치와 푸시 알림이 동작합니다

## 권한 구조

| | 학생 | 관리자(선생님) |
|---|---|---|
| 공지/일정/시간표/급식/자리 열람 | ✅ | ✅ |
| 건의 작성, 내 건의 열람 | ✅ | ✅ |
| 생일/이름 등록(본인) | ✅ | ✅ |
| 콘텐츠 작성·수정·삭제 | ❌ | ✅ |
| 자리배치 실행, 건의 답변, 알림 발송 | ❌ | ✅ |

- `/admin`은 미들웨어(proxy)에서 차단 + 서버 레이아웃에서 재검증
- 모든 쓰기 권한은 **Supabase RLS 정책**으로 DB 레벨에서도 강제
- 학생의 role 자가 승격은 DB 트리거로 차단

## 프로젝트 구조

```
src/
  app/
    (auth)/login, signup        # 인증
    (main)/                     # 앱 셸 (사이드바/하단 탭)
      page.tsx                  # 홈 대시보드
      timetable, meals, calendar, dday, notices, seats,
      suggestions, notifications, settings, menu
      admin/                    # 관리 콘솔 (관리자 전용)
    api/notify                  # 알림 발송 (인앱 + Web Push)
    api/cron/dday               # 디데이 임박 알림 크론
  components/                   # UI · 캘린더 · 자리배치 · 알림 컴포넌트
  lib/
    supabase/                   # 브라우저/서버/관리자 클라이언트
    seating.ts                  # 자리배치 알고리즘 (제약조건 + rejection sampling)
    meals.ts                    # NEIS 연동 + 수동 입력 병합
    notify.ts                   # 알림 저장 + Web Push 발송
  proxy.ts                      # 인증/권한 미들웨어
supabase/schema.sql             # 스키마 + RLS + 트리거
supabase/seed.sql               # 데모 시드 데이터
public/sw.js                    # 서비스 워커 (오프라인 캐시 + 푸시 수신)
```
