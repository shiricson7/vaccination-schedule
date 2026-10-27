import { sortVaccines } from "./vaccines";

/** 라벨 규격 (mm) */
export const LABEL = { widthMm: 50, heightMm: 30 } as const;

/** CSS 기준 1mm = 96/25.4 px. 화면과 인쇄 모두 같은 값을 쓴다. */
export const MM_TO_PX = 96 / 25.4;

/** 측정값이 아직 없을 때(첫 렌더) 라벨 한 장에 담는 항목 수 */
export const FALLBACK_ITEMS_PER_LABEL = 4;

/** 화면 측정과 인쇄 레이아웃 사이의 미세한 오차를 흡수하는 여유 (px) */
const SAFETY_PX = 2;

export type Schedule = { date: string; vaccines: string[] };

export type LabelPage = {
  key: string;
  date: string;
  items: string[];
  /** 같은 날짜 안에서의 순번 (1부터) */
  index: number;
  /** 같은 날짜가 차지하는 라벨 수 */
  total: number;
};

/** 숨긴 라벨을 실제 폰트로 렌더해서 얻은 치수 (px) */
export type LabelMetrics = {
  bodyHeight: number;
  gap: number;
  itemHeights: Record<string, number>;
};

/**
 * 날짜별 백신 목록을 라벨 높이에 맞춰 여러 장으로 나눈다.
 * 백신이 하나도 없는 날짜는 라벨을 만들지 않는다.
 */
export function paginateLabels(
  schedules: readonly Schedule[],
  metrics: LabelMetrics | null,
  order: readonly string[],
): LabelPage[] {
  const pages: LabelPage[] = [];
  for (const s of schedules) {
    if (s.vaccines.length === 0) continue;
    const items = sortVaccines(s.vaccines, order);
    const chunks = metrics
      ? packByHeight(items, metrics)
      : chunk(items, FALLBACK_ITEMS_PER_LABEL);
    chunks.forEach((c, i) => {
      pages.push({
        key: `${s.date}-${i + 1}`,
        date: s.date,
        items: c,
        index: i + 1,
        total: chunks.length,
      });
    });
  }
  return pages;
}

function packByHeight(
  items: string[],
  { bodyHeight, gap, itemHeights }: LabelMetrics,
): string[][] {
  const limit = bodyHeight - SAFETY_PX;
  // 측정이 비정상(숨겨진 상태 등)이면 고정 개수로 나눈다.
  if (limit <= 0) return chunk(items, FALLBACK_ITEMS_PER_LABEL);
  const fallbackH =
    median(Object.values(itemHeights).filter((h) => h > 0)) ||
    limit / FALLBACK_ITEMS_PER_LABEL;

  const chunks: string[][] = [];
  let current: string[] = [];
  let used = 0;

  for (const item of items) {
    const h = itemHeights[item] > 0 ? itemHeights[item] : fallbackH;
    const next = current.length === 0 ? h : used + gap + h;
    if (current.length > 0 && next > limit) {
      chunks.push(current);
      current = [item];
      used = h;
    } else {
      current.push(item);
      used = next;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
