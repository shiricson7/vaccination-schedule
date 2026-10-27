"use client";

import { AlignCenter, AlignLeft, Minus, Plus } from "lucide-react";
import type { TextLabelRender } from "../hooks/useTextLabelRender";
import { cx } from "../lib/cx";
import type { TextAlign } from "../lib/labelCanvas";

const MAX_COPIES = 99;

type Props = {
  text: string;
  align: TextAlign;
  copies: number;
  render: TextLabelRender | null;
  onTextChange: (text: string) => void;
  onAlignChange: (align: TextAlign) => void;
  onCopiesChange: (copies: number) => void;
};

const clampCopies = (n: number) =>
  Math.min(MAX_COPIES, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

/** 가운데 패널(텍스트 모드): 문구 입력, 정렬, 장수 */
export function TextEditor({
  text,
  align,
  copies,
  render,
  onTextChange,
  onAlignChange,
  onCopiesChange,
}: Props) {
  const hasText = text.trim() !== "";

  return (
    <section
      aria-labelledby="text-heading"
      className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">텍스트 라벨</p>
          <h2 id="text-heading" className="mt-1 text-xl font-semibold tracking-tight">
            원하는 문구를 라벨 한 장에
          </h2>
        </div>
        {hasText && render && (
          <span
            className={cx(
              "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold tabular-nums",
              render.overflow ? "bg-danger-soft text-danger" : "bg-mint text-mint-ink",
            )}
          >
            {render.overflow ? "글자가 너무 많음" : `${render.fontPt}pt · ${render.lines}줄`}
          </span>
        )}
      </header>

      <label htmlFor="label-text" className="sr-only">
        출력할 문구
      </label>
      <textarea
        id="label-text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={5}
        placeholder={"출력할 문구를 입력하세요.\n줄바꿈도 그대로 찍힙니다."}
        className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-base leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">정렬</span>
          <div
            role="group"
            aria-label="정렬"
            className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5"
          >
            {(
              [
                { value: "left", label: "왼쪽", Icon: AlignLeft },
                { value: "center", label: "가운데", Icon: AlignCenter },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={align === value}
                onClick={() => onAlignChange(value)}
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-medium transition-colors",
                  align === value
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgb(43_38_34/0.08)]"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="label-copies" className="text-ink-muted">
            장수
          </label>
          <div className="inline-flex items-center rounded-xl border border-line">
            <button
              type="button"
              aria-label="한 장 줄이기"
              onClick={() => onCopiesChange(clampCopies(copies - 1))}
              disabled={copies <= 1}
              className="flex size-9 items-center justify-center rounded-l-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <input
              id="label-copies"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COPIES}
              value={copies}
              onChange={(e) => onCopiesChange(clampCopies(e.target.valueAsNumber))}
              className="h-9 w-14 border-x border-line bg-surface text-center font-mono text-sm tabular-nums focus:outline-none"
            />
            <button
              type="button"
              aria-label="한 장 늘리기"
              onClick={() => onCopiesChange(clampCopies(copies + 1))}
              disabled={copies >= MAX_COPIES}
              className="flex size-9 items-center justify-center rounded-r-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {render?.overflow && hasText ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          가장 작은 글자(8pt)로도 다 들어가지 않아 뒷부분이 잘립니다. 문구를 줄여 주세요.
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">
          50 × 30 mm 라벨 한 장에 맞춰 글자 크기를 자동으로 고릅니다. 문구가 길수록 작아집니다.
        </p>
      )}
    </section>
  );
}
