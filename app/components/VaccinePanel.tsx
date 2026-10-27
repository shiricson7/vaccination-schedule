"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cx } from "../lib/cx";
import { weekdayOf } from "../lib/date";
import type { Schedule } from "../lib/labels";
import { splitVaccineName, type VaccineSet } from "../lib/vaccines";
import { VaccineSets } from "./VaccineSets";

type Props = {
  schedule: Schedule;
  labelCount: number;
  /** 전체 백신 목록 (기본 + 사용자 추가) */
  vaccines: readonly string[];
  customVaccines: readonly string[];
  sets: VaccineSet[];
  onToggle: (vaccine: string) => void;
  onRemove: () => void;
  onApplySet: (set: VaccineSet) => void;
  onSaveSet: (name: string) => string | null;
  onDeleteSet: (set: VaccineSet) => void;
  onAddVaccine: (name: string) => string | null;
  onDeleteVaccine: (vaccine: string) => void;
};

/** 가운데 패널: 선택한 날짜의 백신 고르기 */
export function VaccinePanel({
  schedule,
  labelCount,
  vaccines,
  customVaccines,
  sets,
  onToggle,
  onRemove,
  onApplySet,
  onSaveSet,
  onDeleteSet,
  onAddVaccine,
  onDeleteVaccine,
}: Props) {
  const selected = new Set(schedule.vaccines);
  const custom = new Set(customVaccines);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const cancelAdd = () => {
    setAdding(false);
    setNewName("");
    setAddError(null);
  };

  const submitAdd = (e: FormEvent) => {
    e.preventDefault();
    const err = onAddVaccine(newName);
    if (err) {
      setAddError(err);
      return;
    }
    cancelAdd();
  };

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

      <VaccineSets
        sets={sets}
        selected={selected}
        canSave={selected.size > 0}
        onApply={onApplySet}
        onSave={onSaveSet}
        onDelete={onDeleteSet}
      />

      <div
        role="group"
        aria-label={`${schedule.date} 이후 접종할 백신`}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {vaccines.map((vaccine) => {
          const on = selected.has(vaccine);
          const isCustom = custom.has(vaccine);
          const { main, detail } = splitVaccineName(vaccine);
          return (
            <div key={vaccine} className="relative">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(vaccine)}
                className={cx(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                  isCustom && "pr-9",
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
                  {(detail || isCustom) && (
                    <span
                      className={cx(
                        "block text-xs",
                        on ? "text-mint-ink/80" : "text-ink-muted",
                      )}
                    >
                      {detail ?? "직접 추가"}
                    </span>
                  )}
                </span>
              </button>
              {isCustom && (
                <button
                  type="button"
                  aria-label={`${vaccine} 백신 삭제`}
                  title="목록에서 삭제"
                  onClick={() => onDeleteVaccine(vaccine)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {adding ? (
          <form
            onSubmit={submitAdd}
            className="flex min-h-12 flex-col gap-2 rounded-xl border-2 border-dashed border-line-strong p-2.5"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelAdd();
              }}
              placeholder="백신 이름 (예: 대상포진)"
              aria-label="추가할 백신 이름"
              aria-invalid={addError ? true : undefined}
              maxLength={40}
              className="h-9 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="h-8 flex-1 rounded-lg bg-accent text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong"
              >
                목록에 추가
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                className="h-8 rounded-lg px-3 text-xs text-ink-muted transition-colors hover:bg-surface-2"
              >
                취소
              </button>
            </div>
            {addError && (
              <p role="alert" className="text-xs text-danger">
                {addError}
              </p>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            <Plus className="size-4" />
            백신 추가
          </button>
        )}
      </div>
    </section>
  );
}
