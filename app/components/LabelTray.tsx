"use client";

import type { ReactNode } from "react";
import type { UseNiimbot } from "../hooks/useNiimbot";
import { NiimbotPanel } from "./NiimbotPanel";

type Props = {
  /** 지금 출력하면 나갈 장수 */
  count: number;
  /** 미리보기 */
  children: ReactNode;
  niimbot: UseNiimbot;
  onPrint: () => void;
  onConnect: () => void;
};

/** 오른쪽 열: 인쇄될 라벨 미리보기 + NIIMBOT 프린터 패널 */
export function LabelTray({ count, children, niimbot, onPrint, onConnect }: Props) {
  return (
    <div className="flex flex-col lg:h-full">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <h2 className="eyebrow">프린터 트레이</h2>
        <span className="font-mono text-xs text-ink-muted tabular-nums">
          50 × 30 mm · {count}장
        </span>
      </div>

      <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="rounded-2xl bg-accent-soft/60 p-4">{children}</div>
      </div>

      <NiimbotPanel
        niimbot={niimbot}
        jobCount={count}
        onPrint={onPrint}
        onConnect={onConnect}
      />
    </div>
  );
}
