"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { LabelMetrics } from "../lib/labels";
import { CLINIC_NAME } from "../lib/vaccines";

/**
 * 숨긴 라벨을 실제 폰트로 렌더해 본문 높이와 항목별 높이를 측정한다.
 * 폰트가 늦게 로드되면(document.fonts) 다시 측정한다.
 */
export function useLabelMetrics(items: readonly string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<LabelMetrics | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      // 인쇄 렌더링 중에는 측정용 라벨이 숨겨져(display:none) 모든 값이 0으로 나온다.
      // 그 값으로 페이지를 나누면 항목이 한 장에 하나씩 흩어지므로 무시한다.
      if (window.matchMedia("print").matches) return;
      const body = root.querySelector<HTMLElement>(".label-body");
      if (!body || body.clientHeight <= 0) return;
      const gap = parseFloat(getComputedStyle(body).rowGap) || 0;
      const itemHeights: Record<string, number> = {};
      body.querySelectorAll<HTMLElement>(".label-item").forEach((el) => {
        const name = el.dataset.name;
        if (name) itemHeights[name] = el.getBoundingClientRect().height;
      });
      const next: LabelMetrics = { bodyHeight: body.clientHeight, gap, itemHeights };
      setMetrics((prev) => (prev && sameMetrics(prev, next) ? prev : next));
    };

    measure();
    const fonts = document.fonts;
    fonts.ready.then(measure).catch(() => {});
    fonts.addEventListener("loadingdone", measure);
    return () => fonts.removeEventListener("loadingdone", measure);
  }, [items]);

  return { ref, metrics };
}

function sameMetrics(a: LabelMetrics, b: LabelMetrics): boolean {
  if (a.bodyHeight !== b.bodyHeight || a.gap !== b.gap) return false;
  const keys = Object.keys(a.itemHeights);
  if (keys.length !== Object.keys(b.itemHeights).length) return false;
  return keys.every((k) => a.itemHeights[k] === b.itemHeights[k]);
}

type MeasureProps = {
  items: readonly string[];
  measureRef: RefObject<HTMLDivElement | null>;
};

/** 측정 전용 라벨. 화면 밖에 두고 접근성 트리에서도 뺀다. */
export function LabelMeasure({ items, measureRef }: MeasureProps) {
  return (
    <div ref={measureRef} className="label-measure" aria-hidden="true">
      <div className="label">
        <div className="label-head">
          <span>{CLINIC_NAME} · 예방접종 안내</span>
          <span className="label-page">9/9</span>
        </div>
        <div className="label-date">2026.12.31 (목) 이후 접종</div>
        <div className="label-rule" />
        <ul className="label-body">
          {items.map((vaccine) => (
            <li key={vaccine} className="label-item" data-name={vaccine}>
              {vaccine}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
