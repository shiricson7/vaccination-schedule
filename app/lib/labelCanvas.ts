import { formatLabelDate } from "./date";
import type { LabelPage } from "./labels";
import { CLINIC_NAME } from "./vaccines";

/**
 * 라벨을 프린터 비트맵(캔버스)으로 그린다.
 * 접종 안내 라벨은 globals.css의 .label 레이아웃(여백·글자 크기·체크박스)을 mm/pt 단위 그대로 옮겼고,
 * 텍스트 라벨은 문구가 한 장에 들어가도록 글자 크기를 자동으로 고른다.
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

export type TextAlign = "left" | "center";

export type TextLabelOptions = LabelCanvasOptions & {
  text: string;
  align: TextAlign;
};

export type TextLabelResult = {
  canvas: HTMLCanvasElement;
  /** 자동으로 고른 글자 크기 (pt) */
  fontPt: number;
  lines: number;
  /** 가장 작은 크기로도 다 들어가지 않아 뒷부분이 잘렸는지 */
  overflow: boolean;
};

/** 이 밝기보다 어두우면 검정으로 찍는다 (안티앨리어싱 가장자리 정리) */
const BLACK_THRESHOLD = 150;
/** 텍스트 라벨에서 시도하는 글자 크기 (큰 것부터) */
const TEXT_SIZES_PT = [28, 26, 24, 22, 20, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8];
const TEXT_LINE_HEIGHT = 1.3;
/** 이 크기 이상에서 줄이 안 꺾이면 그 크기를 우선 쓴다 */
const NO_WRAP_MIN_PT = 10;

type LabelContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  mm: (v: number) => number;
  pt: (v: number) => number;
  /** 좌우 여백 (인쇄 가능 폭이 라벨보다 좁은 만큼 줄어든다) */
  padX: number;
  font: (weight: number, sizePx: number) => void;
  text: (s: string, x: number, yMid: number, align?: CanvasTextAlign) => void;
};

function createLabelContext(o: LabelCanvasOptions): LabelContext {
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

  // 인쇄 가능 폭이 라벨 폭보다 좁은 만큼(M2_H: 50mm 중 48mm) 좌우 여백을 줄인다.
  const edgeLoss = Math.max(0, (mm(o.labelWidthMm) - w) / 2);
  const padX = Math.max(mm(0.8), mm(2.2) - edgeLoss);

  return {
    canvas,
    ctx,
    w,
    h,
    mm,
    pt,
    padX,
    font: (weight, sizePx) => {
      ctx.font = `${weight} ${sizePx}px ${o.fontFamily}`;
    },
    text: (s, x, yMid, align = "left") => {
      ctx.textAlign = align;
      ctx.fillText(s, x, yMid);
    },
  };
}

/** 접종 안내 라벨 1장 */
export function renderLabelCanvas(
  page: LabelPage,
  o: LabelCanvasOptions,
): HTMLCanvasElement {
  const { canvas, ctx, w, h, mm, pt, padX, font, text } = createLabelContext(o);
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
 * 자유 문구 라벨 1장. 줄바꿈은 그대로 살리고, 큰 글자부터 시도해 한 장에 들어가는
 * 가장 큰 크기를 고른다. 세로는 가운데 정렬.
 */
export function renderTextLabelCanvas(o: TextLabelOptions): TextLabelResult {
  const { canvas, ctx, w, h, mm, pt, padX, font, text } = createLabelContext(o);
  const padTop = mm(2);
  const padBottom = mm(2);
  const contentW = w - padX * 2;
  const contentH = h - padTop - padBottom;
  const paragraphs = o.text.replace(/\r\n?/g, "\n").split("\n");

  const layout = (sizePt: number) => {
    font(600, pt(sizePt));
    const lines = paragraphs.flatMap((p) =>
      p.trim() === "" ? [""] : wrapText(ctx, p, contentW),
    );
    return {
      sizePt,
      lines,
      lineH: pt(sizePt) * TEXT_LINE_HEIGHT,
      /** 입력한 줄이 폭에 안 맞아 자동으로 꺾였는지 */
      wrapped: lines.length > paragraphs.length,
    };
  };

  const layouts = TEXT_SIZES_PT.map(layout);
  const fits = (l: (typeof layouts)[number]) => l.lines.length * l.lineH <= contentH;
  // 입력한 줄바꿈이 그대로 유지되는 크기를 우선 고르고(너무 작아지지 않는 선에서),
  // 없으면 자동 줄바꿈을 허용한 가장 큰 크기를 고른다.
  let chosen =
    layouts.find((l) => !l.wrapped && l.sizePt >= NO_WRAP_MIN_PT && fits(l)) ??
    layouts.find(fits);
  let overflow = false;
  if (!chosen) {
    overflow = true;
    chosen = layouts[layouts.length - 1];
  }

  const maxLines = Math.max(1, Math.floor(contentH / chosen.lineH));
  const lines = chosen.lines.slice(0, maxLines);
  font(600, pt(chosen.sizePt));
  let y = padTop + (contentH - lines.length * chosen.lineH) / 2;
  const x = o.align === "center" ? w / 2 : padX;
  for (const line of lines) {
    text(line, x, y + chosen.lineH / 2, o.align === "center" ? "center" : "left");
    y += chosen.lineH;
  }

  threshold(ctx, w, h);
  return { canvas, fontPt: chosen.sizePt, lines: lines.length, overflow };
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
