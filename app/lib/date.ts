const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "YYYY-MM-DD" → 로컬 Date. new Date(iso)는 UTC로 해석돼 날짜가 밀릴 수 있어 직접 파싱한다. */
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function weekdayOf(iso: string): string | null {
  const d = parseISODate(iso);
  return d ? WEEKDAYS[d.getDay()] : null;
}

/** 라벨용 표기: "2026.11.15 (일)" */
export function formatLabelDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day} (${WEEKDAYS[d.getDay()]})`;
}
