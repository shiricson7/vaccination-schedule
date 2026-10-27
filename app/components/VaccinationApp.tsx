"use client";

import { Printer, RotateCcw, Syringe } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { cx } from "../lib/cx";
import { paginateLabels, type Schedule } from "../lib/labels";
import { btnGhost, btnPrimary } from "../lib/ui";
import { CLINIC_NAME, VACCINES } from "../lib/vaccines";
import { DateSidebar } from "./DateSidebar";
import { LabelMeasure, useLabelMetrics } from "./LabelMeasure";
import { LabelTray } from "./LabelTray";
import { PrintSheet } from "./PrintSheet";
import { StatTiles } from "./StatTiles";
import { VaccinePanel } from "./VaccinePanel";

export function VaccinationApp() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { ref: measureRef, metrics } = useLabelMetrics(VACCINES);

  const sorted = useMemo(
    () => [...schedules].sort((a, b) => a.date.localeCompare(b.date)),
    [schedules],
  );
  const pages = useMemo(() => paginateLabels(sorted, metrics), [sorted, metrics]);
  const labelCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pages) counts.set(p.date, (counts.get(p.date) ?? 0) + 1);
    return counts;
  }, [pages]);

  const selected = sorted.find((s) => s.date === selectedDate) ?? null;
  const vaccineTotal = sorted.reduce((n, s) => n + s.vaccines.length, 0);

  const addSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (!dateInput) {
      setError("날짜를 선택해 주세요.");
      return;
    }
    if (schedules.some((s) => s.date === dateInput)) {
      setError("이미 추가된 날짜입니다.");
      setSelectedDate(dateInput);
      return;
    }
    setSchedules((prev) => [...prev, { date: dateInput, vaccines: [] }]);
    setSelectedDate(dateInput);
    setDateInput("");
    setError(null);
  };

  const removeSchedule = (date: string) => {
    setSchedules((prev) => prev.filter((s) => s.date !== date));
    if (selectedDate === date) {
      const i = sorted.findIndex((s) => s.date === date);
      const next = sorted[i + 1] ?? sorted[i - 1] ?? null;
      setSelectedDate(next ? next.date : null);
    }
  };

  const toggleVaccine = (date: string, vaccine: string) =>
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.date !== date) return s;
        const vaccines = s.vaccines.includes(vaccine)
          ? s.vaccines.filter((v) => v !== vaccine)
          : [...s.vaccines, vaccine];
        return { ...s, vaccines };
      }),
    );

  const clearAll = () => {
    if (schedules.length === 0) return;
    if (window.confirm("모든 날짜와 선택을 지울까요?")) {
      setSchedules([]);
      setSelectedDate(null);
      setError(null);
    }
  };

  const print = async () => {
    try {
      // 라벨 폰트가 다 내려받아진 뒤에 인쇄해야 대체 폰트로 찍히지 않는다.
      await document.fonts.ready;
    } catch {
      /* 폰트 API가 없어도 인쇄는 진행 */
    }
    window.print();
  };

  const canPrint = pages.length > 0;

  return (
    <>
      <div className="app-shell flex min-h-dvh flex-col lg:h-dvh">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-6 lg:static">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <Syringe className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="eyebrow truncate">예방접종 안내 라벨</p>
              <p className="truncate text-sm font-semibold">{CLINIC_NAME}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={clearAll}
              disabled={schedules.length === 0}
              className={cx(btnGhost, "max-sm:hidden")}
            >
              <RotateCcw className="size-4" />
              초기화
            </button>
            <button
              type="button"
              onClick={print}
              disabled={!canPrint}
              title={canPrint ? undefined : "백신을 선택하면 출력할 수 있습니다"}
              className={btnPrimary}
            >
              <Printer className="size-4" />
              라벨 출력
              {canPrint && (
                <span className="rounded-md bg-black/15 px-1.5 font-mono text-xs tabular-nums">
                  {pages.length}장
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)_21rem]">
          <aside
            aria-label="접종 예정일"
            className="border-b border-line bg-surface/70 lg:overflow-y-auto lg:border-r lg:border-b-0"
          >
            <DateSidebar
              schedules={sorted}
              selectedDate={selectedDate}
              labelCountByDate={labelCountByDate}
              dateInput={dateInput}
              error={error}
              onDateInputChange={(value) => {
                setDateInput(value);
                setError(null);
              }}
              onAdd={addSchedule}
              onSelect={setSelectedDate}
            />
          </aside>

          <main className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 lg:overflow-y-auto">
            <h1 className="sr-only">예방접종 스케줄</h1>
            <StatTiles
              dates={sorted.length}
              vaccines={vaccineTotal}
              labels={pages.length}
            />
            {selected ? (
              <VaccinePanel
                schedule={selected}
                labelCount={labelCountByDate.get(selected.date) ?? 0}
                onToggle={(vaccine) => toggleVaccine(selected.date, vaccine)}
                onRemove={() => removeSchedule(selected.date)}
              />
            ) : (
              <EmptyPanel hasDates={sorted.length > 0} />
            )}
          </main>

          <aside
            aria-label="라벨 미리보기"
            className="border-t border-line bg-surface/70 lg:min-h-0 lg:border-l lg:border-t-0"
          >
            <LabelTray pages={pages} onPrint={print} />
          </aside>
        </div>
      </div>

      <LabelMeasure items={VACCINES} measureRef={measureRef} />
      <PrintSheet pages={pages} />
    </>
  );
}

function EmptyPanel({ hasDates }: { hasDates: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-sm font-medium">
        {hasDates ? "날짜를 선택하세요" : "아직 추가된 날짜가 없습니다"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        {hasDates
          ? "목록에서 날짜를 고르면 그날 이후에 맞을 백신을 선택할 수 있습니다."
          : "접종 예정일을 추가하면 여기에서 백신을 고를 수 있습니다."}
      </p>
    </div>
  );
}
