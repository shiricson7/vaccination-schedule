import { formatLabelDate } from "./date";
import type { LabelPage } from "./labels";
import { CLINIC_NAME } from "./vaccines";

/**
 * 라벨 1장을 프린터 비트맵(캔버스)으로 그린다.
 * globals.css의 .label 레이아웃(여백·글자 크기·체크박스)을 mm/pt 단위 그대로 옮겼다.
 */
export type LabelCanvasOptions = {
  dpi: number;
  /** 가로 픽셀 수. 헤드 폭이 라벨보다 좁으면 그만큼 좌우 여백을 줄여 그린다. */
  widthPx: number;
  heightPx: number;
  labelWidthMm: number;
  labelHeightMm: number;
  /** canvas font에 쓸 글꼴 목록 (예: '"IBM Plex Sans KR", sans-serif') */
  fontFamily: string;
};

/** 이 밝기보다 어두우면 검정으로 찍는다 (안티앨리어싱 가장자리 정리) */
const BLACK_THRESHOLD = 150;

export function renderLabelCanvas(
  page: LabelPage,
  o: LabelCanvasOptions,
): HTMLCanvasElement {
  const mm = (v: number) => (v / 25.4) * o.dpi;
  const pt = (v: number) => (v / 72) * o.dpi;

  const canvas = document.createElement("canvas");
  canvas.width = o.widthPx;
  canvas.height = o.heightPx;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");

  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.textBaseline = "middle";

  const font = (weight: number, sizePx: number) => {
    ctx.font = `${weight} ${sizePx}px ${o.fontFamily}`;
  };
  const text = (s: string, x: number, yMid: number, align: CanvasTextAlign = "left") => {
    ctx.textAlign = align;
    ctx.fillText(s, x, yMid);
  };

  // 인쇄 가능 폭이 라벨 폭보다 좁은 만큼(M2_H: 50mm 중 48mm) 좌우 여백을 줄인다.
  const edgeLoss = Math.max(0, (mm(o.labelWidthMm) - w) / 2);
  const padX = Math.max(mm(0.8), mm(2.2) - edgeLoss);
  const padTop = mm(2);
  const padBottom = mm(1.5);
  const contentW = w - padX * 2;
  let y = padTop;

  // 머리글: 병원 이름 · 안내 / 페이지 번호
  const headSize = pt(6);
  const headLH = headSize * 1.2;
  font(500, headSize);
  text(`${CLINIC_NAME} · 예방접종 안내`, padX, y + headLH / 2);
  if (page.total > 1) {
    font(600, headSize);
    text(`${page.index}/${page.total}`, w - padX, y + headLH / 2, "right");
  }
  y += headLH;

  // 날짜
  y += mm(0.3);
  const dateSize = pt(10);
  const dateLH = dateSize * 1.2;
  font(700, dateSize);
  text(`${formatLabelDate(page.date)} 이후 접종`, padX, y + dateLH / 2);
  y += dateLH;

  // 구분선
  y += mm(0.8);
  ctx.fillRect(padX, y, contentW, mm(0.25));
  y += mm(0.25) + mm(0.9);

  // 항목: 체크박스 + 백신 이름
  const itemSize = pt(8);
  const itemLH = itemSize * 1.3;
  const gap = mm(0.5);
  const box = mm(1.9);
  const boxGap = mm(1);
  const boxTop = mm(0.75);
  const stroke = mm(0.25);
  const textX = padX + box + boxGap;
  const textW = contentW - box - boxGap;
  const bottom = h - padBottom;
  font(500, itemSize);

  for (const item of page.items) {
    const lines = wrapText(ctx, item, textW);
    const blockH = lines.length * itemLH;
    // 페이지 분할이 이미 높이를 맞춰 두지만, 혹시 넘치면 잘라 낸다.
    if (y + blockH > bottom + 1) break;

    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.roundRect(padX + stroke / 2, y + boxTop + stroke / 2, box - stroke, box - stroke, mm(0.3));
    ctx.stroke();

    lines.forEach((line, i) => text(line, textX, y + itemLH * i + itemLH / 2));
    y += blockH + gap;
  }

  threshold(ctx, w, h);
  return canvas;
}

/**
 * 급지 방향이 "left"인 모델용: 라벨을 90° 돌려 가로(폭)가 급지 방향이 되게 한다.
 * (M2_H는 "top"이라 쓰지 않지만 다른 모델을 위해 둔다)
 */
export function rotateForLeftFeed(source: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = source.height;
  rotated.height = source.width;
  const ctx = rotated.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, rotated.width, rotated.height);
  ctx.translate(0, rotated.height);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return rotated;
}

/** 공백 우선, 안 되면 글자 단위로 줄을 나눈다 (CSS overflow-wrap: anywhere 와 비슷하게) */
function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of value) {
    const candidate = current + ch;
    if (current === "" || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    const space = current.lastIndexOf(" ");
    if (space > 0) {
      lines.push(current.slice(0, space));
      current = current.slice(space + 1) + ch;
    } else {
      lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** 회색 픽셀을 흑/백으로 정리한다. 열전사 프린터는 1비트만 찍는다. */
function threshold(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum < BLACK_THRESHOLD ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
