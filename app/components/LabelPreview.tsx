"use client";

import { useEffect, useRef, useState } from "react";
import { formatLabelDate } from "../lib/date";
import { LABEL, MM_TO_PX, type LabelPage } from "../lib/labels";
import { Label } from "./Label";

const LABEL_W_PX = LABEL.widthMm * MM_TO_PX;
const LABEL_H_PX = LABEL.heightMm * MM_TO_PX;

/** 인쇄될 라벨을 실제 비율 그대로 확대해서 보여 준다. */
export function LabelPreview({ pages }: { pages: LabelPage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.6);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(2.4, Math.max(1, width / LABEL_W_PX)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frame = { width: LABEL_W_PX * scale, height: LABEL_H_PX * scale };

  return (
    <div ref={ref} className="flex flex-col items-start gap-4">
      {pages.length === 0 ? (
        <div
          style={frame}
          className="flex items-center justify-center rounded-sm border border-dashed border-line-strong px-4 text-center text-sm text-ink-muted"
        >
          백신을 선택하면 라벨이 여기에 표시됩니다.
        </div>
      ) : (
        pages.map((page) => (
          <figure key={page.key} className="m-0 flex flex-col gap-1.5">
            <div className="label-frame" style={frame}>
              <Label page={page} style={{ transform: `scale(${scale})` }} />
            </div>
            <figcaption className="flex items-baseline gap-2 text-xs text-ink-muted">
              <span className="font-mono">{formatLabelDate(page.date)}</span>
              {page.total > 1 && (
                <span className="font-mono">
                  {page.index} / {page.total}
                </span>
              )}
            </figcaption>
          </figure>
        ))
      )}
    </div>
  );
}
