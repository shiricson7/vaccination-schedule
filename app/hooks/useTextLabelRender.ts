"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { renderTextLabelCanvas, type TextAlign } from "../lib/labelCanvas";
import {
  canvasSizeFor,
  labelFontFamily,
  M2_H_PROFILE,
  type PrinterProfile,
} from "../lib/niimbot";

export type TextLabelRender = {
  canvas: HTMLCanvasElement;
  fontPt: number;
  lines: number;
  overflow: boolean;
};

const noSubscribe = () => () => {};

/**
 * 텍스트 라벨 미리보기용 비트맵. 프린터로 보내는 것과 같은 함수로 그린다.
 * 연결 전에는 M2_H 크기로 그리고, 글꼴이 늦게 로드되면 다시 그린다.
 */
export function useTextLabelRender(
  text: string,
  align: TextAlign,
  profile: PrinterProfile | null,
): TextLabelRender | null {
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [fontsTick, setFontsTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const bump = () => {
      if (alive) setFontsTick((t) => t + 1);
    };
    document.fonts.ready.then(bump).catch(() => undefined);
    document.fonts.addEventListener("loadingdone", bump);
    return () => {
      alive = false;
      document.fonts.removeEventListener("loadingdone", bump);
    };
  }, []);

  return useMemo(() => {
    if (!mounted) return null;
    void fontsTick; // 글꼴이 로드되면 다시 그리기 위한 의존성
    const size = canvasSizeFor(profile ?? M2_H_PROFILE);
    const result = renderTextLabelCanvas({
      ...size,
      fontFamily: labelFontFamily(),
      text,
      align,
    });
    return result;
  }, [mounted, fontsTick, profile, text, align]);
}
