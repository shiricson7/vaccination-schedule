"use client";

import { Check, Trash2 } from "lucide-react";
import { cx } from "../lib/cx";
import { weekdayOf } from "../lib/date";
import type { Schedule } from "../lib/labels";
import { splitVaccineName, VACCINES } from "../lib/vaccines";

type Props = {
  schedule: Schedule;
  labelCount: number;
  onToggle: (vaccine: string) => void;
  onRemove: () => void;
};

/** 가운데 패널: 선택한 날짜의 백신 고르기 */
export function VaccinePanel({ schedule, labelCount, onToggle, onRemove }: Props) {
  const selected = new Set(schedule.vaccines);

  return (
    <section
      aria-labelledby="panel-heading"
      className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">선택한 날짜</p>
          <h2
            id="panel-heading"
            className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"
          >
            <span className="font-mono text-xl font-semibold tracking-tight tabular-nums">
              {schedule.date}
            </span>
            <span className="text-sm text-ink-muted">
              ({weekdayOf(schedule.date)}) 이후 접종
            </span>
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cx(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              selected.size > 0
                ? "bg-mint text-mint-ink"
                : "bg-surface-2 text-ink-muted",
            )}
          >
            {selected.size > 0
              ? `${selected.size}개 선택 · 라벨 ${labelCount}장`
              : "백신을 선택하세요"}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${schedule.date} 삭제`}
            title="이 날짜 삭제"
            className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <div
        role="group"
        aria-label={`${schedule.date} 이후 접종할 백신`}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {VACCINES.map((vaccine) => {
          const on = selected.has(vaccine);
          const { main, detail } = splitVaccineName(vaccine);
          return (
            <button
              key={vaccine}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(vaccine)}
              className={cx(
                "flex min-h-12 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                on
                  ? "border-mint-strong bg-mint text-mint-ink"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  on
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line-strong bg-surface",
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-semibold">{main}</span>
                {detail && (
                  <span
                    className={cx(
                      "block text-xs",
                      on ? "text-mint-ink/80" : "text-ink-muted",
                    )}
                  >
                    {detail}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
