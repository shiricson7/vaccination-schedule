"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cx } from "../lib/cx";
import { firstLine, suggestTemplateName, type TextTemplate } from "../lib/text";

type Props = {
  templates: TextTemplate[];
  /** 지금 편집 중인 문구가 어느 템플릿에서 왔는지 */
  activeId: string | null;
  /** 저장할 문구가 있을 때만 "저장" 활성화 */
  canSave: boolean;
  /** 저장 이름 제안에 쓰는 현재 문구 */
  currentText: string;
  onLoad: (template: TextTemplate) => void;
  /** 저장 성공이면 null, 실패면 오류 메시지 */
  onSave: (name: string) => string | null;
  onDelete: (template: TextTemplate) => void;
};

/** 왼쪽 열(텍스트 모드): 자주 쓰는 문구 */
export function TextTemplates({
  templates,
  activeId,
  canSave,
  currentText,
  onLoad,
  onSave,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setName(suggestTemplateName(currentText));
    setError(null);
    setEditing(true);
  };

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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">
          자주 쓰는 문구{" "}
          {templates.length > 0 && (
            <span className="font-mono tabular-nums">{templates.length}</span>
          )}
        </p>
        {!editing && (
          <button
            type="button"
            onClick={open}
            disabled={!canSave}
            title={canSave ? "지금 입력한 문구를 저장" : "먼저 문구를 입력하세요"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            현재 문구 저장
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="flex flex-col gap-2">
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
            placeholder="문구 이름"
            aria-label="문구 이름"
            aria-invalid={error ? true : undefined}
            maxLength={30}
            className="h-9 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-9 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
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
          </div>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      )}

      {templates.length === 0 ? (
        <p className="text-xs text-ink-muted">
          자주 쓰는 문구를 저장해 두면 눌러서 바로 불러와 출력할 수 있습니다. 이 브라우저에
          저장됩니다.
        </p>
      ) : (
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {templates.map((t) => {
            const on = t.id === activeId;
            return (
              <li key={t.id} className="relative w-56 shrink-0 lg:w-auto lg:shrink">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => onLoad(t)}
                  title={t.text}
                  className={cx(
                    "w-full rounded-xl border px-3 py-2 pr-9 text-left transition-colors",
                    on
                      ? "border-line bg-surface shadow-[0_1px_2px_rgb(43_38_34/0.06)]"
                      : "border-transparent hover:bg-surface-2",
                  )}
                >
                  <span className="block truncate text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {firstLine(t.text) || "(빈 문구)"}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t.name} 문구 삭제`}
                  title="삭제"
                  onClick={() => onDelete(t)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
