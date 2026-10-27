"use client";

import { CalendarPlus } from "lucide-react";
import type { FormEvent } from "react";
import { cx } from "../lib/cx";
import { weekdayOf } from "../lib/date";
import type { Schedule } from "../lib/labels";
import { btnPrimary } from "../lib/ui";

type Props = {
  schedules: Schedule[];
  selectedDate: string | null;
  labelCountByDate: Map<string, number>;
  dateInput: string;
  error: string | null;
  onDateInputChange: (value: string) => void;
  onAdd: (e: FormEvent) => void;
  onSelect: (date: string) => void;
};

/** 왼쪽 열: 날짜 추가 폼 + 접종 예정일 타임라인 */
export function DateSidebar({
  schedules,
  selectedDate,
  labelCountByDate,
  dateInput,
  error,
  onDateInputChange,
  onAdd,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-5 p-4">
      <form onSubmit={onAdd} noValidate className="flex flex-col gap-2">
        <label htmlFor="visit-date" className="eyebrow">
          접종 예정일 추가
        </label>
        <div className="flex gap-2">
          <input
            id="visit-date"
            type="date"
            value={dateInput}
            onChange={(e) => onDateInputChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "date-error" : undefined}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            aria-label="날짜 추가"
            title="날짜 추가"
            className={cx(btnPrimary, "w-10 shrink-0 px-0")}
          >
            <CalendarPlus className="size-4" />
          </button>
        </div>
        {error && (
          <p id="date-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </form>

      <div>
        <p className="eyebrow mb-2">
          날짜{" "}
          {schedules.length > 0 && (
            <span className="font-mono tabular-nums">{schedules.length}</span>
          )}
        </p>
        {schedules.length === 0 ? (
          <p className="text-xs text-ink-muted">
            추가한 날짜가 여기에 쌓이고, 고른 날짜의 백신을 가운데에서 선택합니다.
          </p>
        ) : (
          <ol className="timeline flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {schedules.map((s) => {
              const on = s.date === selectedDate;
              const labels = labelCountByDate.get(s.date) ?? 0;
              return (
                <li key={s.date} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => onSelect(s.date)}
                    className={cx(
                      "relative w-full rounded-xl border px-3 py-2 text-left transition-colors lg:pl-8",
                      on
                        ? "border-line bg-surface shadow-[0_1px_2px_rgb(43_38_34/0.06)]"
                        : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <span aria-hidden="true" className="timeline-dot max-lg:hidden" />
                    <span className="block font-mono text-sm font-medium tabular-nums">
                      {s.date}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {weekdayOf(s.date)}요일 · 백신 {s.vaccines.length} · 라벨 {labels}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
