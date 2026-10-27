"use client";

import { Printer } from "lucide-react";
import { cx } from "../lib/cx";
import type { LabelPage } from "../lib/labels";
import { btnPrimary } from "../lib/ui";
import { LabelPreview } from "./LabelPreview";

type Props = { pages: LabelPage[]; onPrint: () => void };

/** 오른쪽 열: 인쇄될 라벨 미리보기 + 출력 버튼 */
export function LabelTray({ pages, onPrint }: Props) {
  const canPrint = pages.length > 0;

  return (
    <div className="flex flex-col lg:h-full">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <h2 className="eyebrow">프린터 트레이</h2>
        <span className="font-mono text-xs text-ink-muted tabular-nums">
          50 × 30 mm · {pages.length}장
        </span>
      </div>

      <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="rounded-2xl bg-accent-soft/60 p-4">
          <LabelPreview pages={pages} />
        </div>
      </div>

      <div className="border-t border-line p-4">
        <button
          type="button"
          onClick={onPrint}
          disabled={!canPrint}
          title={canPrint ? undefined : "백신을 선택하면 출력할 수 있습니다"}
          className={cx(btnPrimary, "h-11 w-full")}
        >
          <Printer className="size-4" />
          {canPrint ? `라벨 ${pages.length}장 출력` : "라벨 출력"}
        </button>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer select-none text-ink-muted hover:text-ink">
            프린터 설정 안내
          </summary>
          <ul className="mt-2 space-y-1.5 text-ink-muted">
            <li>용지 크기: 50 × 30 mm (라벨 1장 = 1페이지)</li>
            <li>여백: 없음 · 머리글/바닥글 끄기</li>
            <li>배율: 100% (&quot;페이지에 맞춤&quot; 사용 안 함)</li>
            <li>라벨 수만큼 페이지가 생기니 용지를 넉넉히 넣어 두세요.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
