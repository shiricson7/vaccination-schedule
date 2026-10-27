"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 프린터로 보낼 것과 같은 비트맵. null이면 아직 못 그림 */
  canvas: HTMLCanvasElement | null;
  empty: boolean;
  copies: number;
};

/** 텍스트 라벨 미리보기: 50×30 라벨 테두리 안에 48mm 폭 비트맵을 보여 준다 */
export function TextLabelPreview({ canvas, empty, copies }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canvas) return;
    el.width = canvas.width;
    el.height = canvas.height;
    el.getContext("2d")?.drawImage(canvas, 0, 0);
  }, [canvas]);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className="label-frame relative w-full max-w-80 bg-white"
        style={{ aspectRatio: "50 / 30" }}
      >
        {empty ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-muted">
            문구를 입력하면 라벨이 여기에 표시됩니다.
          </p>
        ) : (
          <canvas
            ref={ref}
            role="img"
            aria-label="텍스트 라벨 미리보기"
            className="absolute inset-y-0 left-[2%] h-full w-[96%]"
          />
        )}
      </div>
      <p className="font-mono text-xs text-ink-muted tabular-nums">
        텍스트 라벨 · {empty ? 0 : copies}장
      </p>
    </div>
  );
}
