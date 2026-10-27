"use client";

import { Plus, Star, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cx } from "../lib/cx";
import type { VaccineSet } from "../lib/vaccines";

type Props = {
  sets: VaccineSet[];
  /** 지금 보고 있는 날짜에 선택된 백신 */
  selected: ReadonlySet<string>;
  /** 저장할 선택이 있을 때만 "세트로 저장" 활성화 */
  canSave: boolean;
  onApply: (set: VaccineSet) => void;
  /** 저장 성공이면 null, 실패면 오류 메시지 */
  onSave: (name: string) => string | null;
  onDelete: (set: VaccineSet) => void;
};

/** 즐겨찾기 세트: 자주 쓰는 백신 묶음을 한 번에 선택/해제 */
export function VaccineSets({
  sets,
  selected,
  canSave,
  onApply,
  onSave,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setEditing(false);
    setName("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = onSave(name);
    if (err) {
      setError(err);
      return;
    }
    cancel();
  };

  return (
    <div className="mb-4 rounded-xl border border-line bg-canvas/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">즐겨찾기 세트</p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={!canSave}
            title={canSave ? "지금 선택한 백신들을 세트로 저장" : "먼저 백신을 선택하세요"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            현재 선택을 세트로 저장
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
            placeholder="세트 이름 (예: 2개월 접종)"
            aria-label="세트 이름"
            aria-invalid={error ? true : undefined}
            maxLength={30}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
          >
            저장
          </button>
          <button
            type="button"
            onClick={cancel}
            className="h-9 rounded-lg px-3 text-sm text-ink-muted transition-colors hover:bg-surface-2"
          >
            취소
          </button>
          {error && (
            <p role="alert" className="w-full text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      )}

      {sets.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          자주 쓰는 조합을 세트로 저장해 두면 한 번에 선택할 수 있습니다. 세트는 이
          브라우저에 저장됩니다.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {sets.map((set) => {
            const applied =
              set.vaccines.length > 0 &&
              set.vaccines.every((v) => selected.has(v));
            return (
              <li
                key={set.id}
                className={cx(
                  "inline-flex items-stretch overflow-hidden rounded-xl border-2 transition-colors",
                  applied
                    ? "border-sun bg-butter text-sun-ink"
                    : "border-line bg-surface",
                )}
              >
                <button
                  type="button"
                  aria-pressed={applied}
                  onClick={() => onApply(set)}
                  title={
                    applied
                      ? "세트의 백신 선택 해제"
                      : `한 번에 선택: ${set.vaccines.join(", ")}`
                  }
                  className="flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2/60"
                >
                  <Star
                    className="size-3.5 shrink-0"
                    fill={applied ? "currentColor" : "none"}
                  />
                  <span className="text-sm font-semibold">{set.name}</span>
                  <span className="font-mono text-xs opacity-70 tabular-nums">
                    {set.vaccines.length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${set.name} 세트 삭제`}
                  title="세트 삭제"
                  onClick={() => onDelete(set)}
                  className="flex items-center border-l-2 border-inherit px-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
