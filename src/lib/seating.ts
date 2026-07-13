import type { SeatConstraint, SeatLayout } from "@/lib/database.types";

/**
 * 자리배치 랜덤 알고리즘.
 *
 * 좌석 인덱스: index = row * cols + col (0부터, 칠판에서 가까운 줄이 row 0)
 * 짝(pair): 같은 줄에서 (0,1), (2,3), ... 처럼 붙어 있는 두 자리
 * 인접(adjacent): 상하좌우로 붙어 있는 자리 (짝 포함)
 */

export interface Student {
  id: string;
  name: string;
}

export interface RandomizeOptions {
  layout: Pick<SeatLayout, "rows" | "cols" | "disabled_seats">;
  students: Student[];
  constraints: SeatConstraint[];
  /** 직전 배치 (seats[i] = student_id). "같은 짝 금지" 검사에 사용 */
  previousSeats: (string | null)[] | null;
  /** 직전 배치와 같은 짝 금지 옵션 */
  avoidSamePair: boolean;
}

export interface RandomizeResult {
  seats: (string | null)[];
  /** 제약을 모두 만족했는지. false면 최대 시도 후 제약 일부를 포기한 배치 */
  satisfied: boolean;
  violations: string[];
}

const MAX_ATTEMPTS = 1000;

/** Fisher-Yates 셔플 (원본 불변) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 좌석 인덱스 → 짝 인덱스 (같은 값이면 짝) */
export function pairIndexOf(seatIndex: number, cols: number): number {
  const row = Math.floor(seatIndex / cols);
  const col = seatIndex % cols;
  return row * Math.ceil(cols / 2) + Math.floor(col / 2);
}

/** 두 좌석이 상하좌우로 인접한지 (짝 관계 포함) */
export function isAdjacent(a: number, b: number, cols: number): boolean {
  const ra = Math.floor(a / cols);
  const ca = a % cols;
  const rb = Math.floor(b / cols);
  const cb = b % cols;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

/** 직전 배치에서 학생별 짝 학생 id 매핑 생성 */
function buildPreviousPairs(
  previousSeats: (string | null)[],
  cols: number
): Map<string, string> {
  const byPair = new Map<number, string[]>();
  previousSeats.forEach((studentId, seatIndex) => {
    if (!studentId) return;
    const p = pairIndexOf(seatIndex, cols);
    byPair.set(p, [...(byPair.get(p) ?? []), studentId]);
  });

  const pairs = new Map<string, string>();
  for (const members of byPair.values()) {
    if (members.length === 2) {
      pairs.set(members[0], members[1]);
      pairs.set(members[1], members[0]);
    }
  }
  return pairs;
}

/** 배치가 제약을 만족하는지 검사. 위반 메시지 목록 반환 (빈 배열 = 통과) */
function validate(
  seats: (string | null)[],
  cols: number,
  options: RandomizeOptions,
  previousPairs: Map<string, string>,
  nameOf: (id: string) => string
): string[] {
  const violations: string[] = [];
  const seatOf = new Map<string, number>();
  seats.forEach((id, idx) => {
    if (id) seatOf.set(id, idx);
  });

  // 1) 직전 배치와 같은 짝 금지
  if (options.avoidSamePair && previousPairs.size > 0) {
    const byPair = new Map<number, string[]>();
    seats.forEach((id, idx) => {
      if (!id) return;
      const p = pairIndexOf(idx, cols);
      byPair.set(p, [...(byPair.get(p) ?? []), id]);
    });
    for (const members of byPair.values()) {
      if (members.length === 2 && previousPairs.get(members[0]) === members[1]) {
        violations.push(
          `${nameOf(members[0])} · ${nameOf(members[1])}: 지난번과 같은 짝`
        );
      }
    }
  }

  // 2) 특정 학생 쌍 인접 금지
  for (const c of options.constraints) {
    if (c.type !== "no_adjacent" && c.type !== "no_pair") continue;
    const [a, b] = c.student_ids;
    const sa = seatOf.get(a);
    const sb = seatOf.get(b);
    if (sa === undefined || sb === undefined) continue;

    const samePair = pairIndexOf(sa, cols) === pairIndexOf(sb, cols);
    if (c.type === "no_pair" && samePair) {
      violations.push(`${nameOf(a)} · ${nameOf(b)}: 짝 금지 위반`);
    }
    if (c.type === "no_adjacent" && (samePair || isAdjacent(sa, sb, cols))) {
      violations.push(`${nameOf(a)} · ${nameOf(b)}: 인접 금지 위반`);
    }
  }

  return violations;
}

/**
 * 제약조건을 만족하는 랜덤 배치 생성.
 * 무작위 셔플을 반복하며 제약 검사를 통과하는 배치를 찾는다 (rejection sampling).
 * MAX_ATTEMPTS 안에 못 찾으면 위반이 가장 적은 배치를 반환한다.
 */
export function randomizeSeats(options: RandomizeOptions): RandomizeResult {
  const { layout, students, constraints, previousSeats } = options;
  const totalSeats = layout.rows * layout.cols;
  const disabled = new Set(layout.disabled_seats);

  // 고정석 처리: 해당 학생은 셔플 대상에서 제외
  const fixedByStudent = new Map<string, number>();
  for (const c of constraints) {
    if (c.type === "fixed" && c.seat_index !== null && !disabled.has(c.seat_index)) {
      fixedByStudent.set(c.student_ids[0], c.seat_index);
    }
  }

  const fixedSeats = new Set(fixedByStudent.values());
  const freeSeats: number[] = [];
  for (let i = 0; i < totalSeats; i++) {
    if (!disabled.has(i) && !fixedSeats.has(i)) freeSeats.push(i);
  }
  const freeStudents = students.filter((s) => !fixedByStudent.has(s.id));

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? "?";
  const previousPairs =
    options.avoidSamePair && previousSeats
      ? buildPreviousPairs(previousSeats, layout.cols)
      : new Map<string, string>();

  let best: RandomizeResult | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seats: (string | null)[] = Array(totalSeats).fill(null);
    for (const [studentId, seatIndex] of fixedByStudent) {
      seats[seatIndex] = studentId;
    }
    const shuffled = shuffle(freeStudents);
    const targetSeats = shuffle(freeSeats);
    shuffled.forEach((student, i) => {
      if (i < targetSeats.length) seats[targetSeats[i]] = student.id;
    });

    const violations = validate(seats, layout.cols, options, previousPairs, nameOf);
    if (violations.length === 0) {
      return { seats, satisfied: true, violations: [] };
    }
    if (!best || violations.length < best.violations.length) {
      best = { seats, satisfied: false, violations };
    }
  }

  return best!;
}

/**
 * 모둠 자동 편성: 학생을 셔플한 뒤 원하는 모둠 수로 나눈다.
 * 인원이 나누어떨어지지 않으면 앞 모둠부터 한 명씩 더 배정된다.
 */
export function makeGroups(students: Student[], groupCount: number): Student[][] {
  const shuffled = shuffle(students);
  const groups: Student[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((s, i) => groups[i % groupCount].push(s));
  return groups;
}
