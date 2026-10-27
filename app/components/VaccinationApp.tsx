"use client";

import { Cable, LoaderCircle, Printer, RotateCcw, Syringe } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNiimbot } from "../hooks/useNiimbot";
import { useTextLabelRender } from "../hooks/useTextLabelRender";
import { cx } from "../lib/cx";
import type { TextAlign } from "../lib/labelCanvas";
import { paginateLabels, type Schedule } from "../lib/labels";
import { buildScheduleJobs, buildTextJob } from "../lib/niimbot";
import {
  EMPTY_SETS,
  EMPTY_STRINGS,
  EMPTY_TEMPLATES,
  parseSets,
  parseStringList,
  parseTemplates,
  STORAGE_KEYS,
  useStoredState,
} from "../lib/storage";
import type { TextTemplate } from "../lib/text";
import { btnGhost, btnPrimary } from "../lib/ui";
import {
  CLINIC_NAME,
  DEFAULT_VACCINES,
  makeId,
  normalizeName,
  sortVaccines,
  type VaccineSet,
} from "../lib/vaccines";
import { DateSidebar } from "./DateSidebar";
import { LabelMeasure, useLabelMetrics } from "./LabelMeasure";
import { LabelPreview } from "./LabelPreview";
import { LabelTray } from "./LabelTray";
import { niimbotButtonDisabled, niimbotButtonLabel } from "./NiimbotPanel";
import { StatTiles } from "./StatTiles";
import { TextEditor } from "./TextEditor";
import { TextLabelPreview } from "./TextLabelPreview";
import { TextTemplates } from "./TextTemplates";
import { VaccinePanel } from "./VaccinePanel";

type Mode = "schedule" | "text";

const MODES: { value: Mode; label: string; short: string }[] = [
  { value: "schedule", label: "접종 안내", short: "접종" },
  { value: "text", label: "텍스트 라벨", short: "텍스트" },
];

const DEFAULT_SET = new Set<string>(DEFAULT_VACCINES);

export function VaccinationApp() {
  const [mode, setMode] = useState<Mode>("schedule");

  // ── 접종 안내 ──────────────────────────────────────────
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 이 브라우저에 남는 설정: 직접 추가한 백신, 즐겨찾기 세트, 자주 쓰는 문구
  const [customVaccines, setCustomVaccines] = useStoredState(
    STORAGE_KEYS.customVaccines,
    EMPTY_STRINGS,
    parseStringList,
  );
  const [sets, setSets] = useStoredState(STORAGE_KEYS.sets, EMPTY_SETS, parseSets);
  const [templates, setTemplates] = useStoredState(
    STORAGE_KEYS.textTemplates,
    EMPTY_TEMPLATES,
    parseTemplates,
  );

  const allVaccines = useMemo(
    () => [
      ...DEFAULT_VACCINES,
      ...customVaccines.filter((v) => !DEFAULT_SET.has(v)),
    ],
    [customVaccines],
  );
  const { ref: measureRef, metrics } = useLabelMetrics(allVaccines);

  const sorted = useMemo(
    () => [...schedules].sort((a, b) => a.date.localeCompare(b.date)),
    [schedules],
  );
  const pages = useMemo(
    () => paginateLabels(sorted, metrics, allVaccines),
    [sorted, metrics, allVaccines],
  );
  const labelCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pages) counts.set(p.date, (counts.get(p.date) ?? 0) + 1);
    return counts;
  }, [pages]);

  const selected = sorted.find((s) => s.date === selectedDate) ?? null;
  const vaccineTotal = sorted.reduce((n, s) => n + s.vaccines.length, 0);

  // ── 텍스트 라벨 ────────────────────────────────────────
  const [text, setText] = useState("");
  const [align, setAlign] = useState<TextAlign>("center");
  const [copies, setCopies] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const hasText = text.trim() !== "";

  // ── 프린터 ─────────────────────────────────────────────
  const niimbot = useNiimbot();
  const textRender = useTextLabelRender(text, align, niimbot.profile);
  const jobCount = mode === "schedule" ? pages.length : hasText ? copies : 0;

  const printCurrent = () => {
    if (mode === "schedule") {
      void niimbot.print((profile) => buildScheduleJobs(pages, profile));
    } else if (hasText) {
      void niimbot.print((profile) => buildTextJob(text, align, copies, profile));
    }
  };

  // ── 날짜 ──────────────────────────────────────────────
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

  const clearAll = () => {
    if (schedules.length === 0) return;
    if (
      window.confirm(
        "모든 날짜와 선택을 지울까요?\n(즐겨찾기 세트와 추가한 백신은 남습니다)",
      )
    ) {
      setSchedules([]);
      setSelectedDate(null);
      setError(null);
    }
  };

  // ── 백신 선택 ──────────────────────────────────────────
  const updateVaccines = (date: string, update: (current: string[]) => string[]) =>
    setSchedules((prev) =>
      prev.map((s) => (s.date === date ? { ...s, vaccines: update(s.vaccines) } : s)),
    );

  const toggleVaccine = (date: string, vaccine: string) =>
    updateVaccines(date, (current) =>
      current.includes(vaccine)
        ? current.filter((v) => v !== vaccine)
        : [...current, vaccine],
    );

  /** 세트의 백신이 모두 선택돼 있으면 해제, 아니면 빠진 것을 한 번에 선택 */
  const applySet = (date: string, set: VaccineSet) =>
    updateVaccines(date, (current) => {
      const members = set.vaccines.filter((v) => allVaccines.includes(v));
      if (members.length === 0) return current;
      const allOn = members.every((v) => current.includes(v));
      return allOn
        ? current.filter((v) => !members.includes(v))
        : [...current, ...members.filter((v) => !current.includes(v))];
    });

  // ── 즐겨찾기 세트 ──────────────────────────────────────
  const saveSet = (date: string, rawName: string): string | null => {
    const name = normalizeName(rawName);
    if (!name) return "세트 이름을 입력해 주세요.";
    if (sets.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return "같은 이름의 세트가 이미 있습니다.";
    }
    const current = schedules.find((s) => s.date === date);
    if (!current || current.vaccines.length === 0) {
      return "먼저 백신을 선택해 주세요.";
    }
    setSets((prev) => [
      ...prev,
      { id: makeId(), name, vaccines: sortVaccines(current.vaccines, allVaccines) },
    ]);
    return null;
  };

  const deleteSet = (set: VaccineSet) => {
    if (window.confirm(`'${set.name}' 세트를 삭제할까요?`)) {
      setSets((prev) => prev.filter((s) => s.id !== set.id));
    }
  };

  // ── 백신 목록 추가/삭제 ────────────────────────────────
  const addVaccine = (rawName: string): string | null => {
    const name = normalizeName(rawName);
    if (!name) return "백신 이름을 입력해 주세요.";
    if (allVaccines.some((v) => v.toLowerCase() === name.toLowerCase())) {
      return "이미 목록에 있는 백신입니다.";
    }
    setCustomVaccines((prev) => [...prev, name]);
    return null;
  };

  const deleteVaccine = (vaccine: string) => {
    if (
      !window.confirm(
        `'${vaccine}' 백신을 목록에서 삭제할까요?\n선택한 날짜와 세트에서도 빠집니다.`,
      )
    ) {
      return;
    }
    setCustomVaccines((prev) => prev.filter((v) => v !== vaccine));
    setSchedules((prev) =>
      prev.map((s) =>
        s.vaccines.includes(vaccine)
          ? { ...s, vaccines: s.vaccines.filter((v) => v !== vaccine) }
          : s,
      ),
    );
    setSets((prev) =>
      prev
        .map((set) => ({ ...set, vaccines: set.vaccines.filter((v) => v !== vaccine) }))
        .filter((set) => set.vaccines.length > 0),
    );
  };

  // ── 자주 쓰는 문구 ─────────────────────────────────────
  const loadTemplate = (t: TextTemplate) => {
    setText(t.text);
    setAlign(t.align);
    setActiveTemplateId(t.id);
  };

  const saveTemplate = (rawName: string): string | null => {
    const name = normalizeName(rawName);
    if (!name) return "문구 이름을 입력해 주세요.";
    if (!hasText) return "먼저 문구를 입력해 주세요.";
    if (templates.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return "같은 이름의 문구가 이미 있습니다.";
    }
    const id = makeId();
    setTemplates((prev) => [...prev, { id, name, text, align }]);
    setActiveTemplateId(id);
    return null;
  };

  const deleteTemplate = (t: TextTemplate) => {
    if (window.confirm(`'${t.name}' 문구를 삭제할까요?`)) {
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      if (activeTemplateId === t.id) setActiveTemplateId(null);
    }
  };

  const mainButtonIcon = niimbot.busy ? (
    <LoaderCircle className="size-4 animate-spin" />
  ) : niimbot.profile ? (
    <Printer className="size-4" />
  ) : (
    <Cable className="size-4" />
  );

  return (
    <>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:static">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <Syringe className="size-4" />
            </span>
            <div className="min-w-0 leading-tight max-sm:hidden">
              <p className="eyebrow truncate">예방접종 안내 라벨</p>
              <p className="truncate text-sm font-semibold">{CLINIC_NAME}</p>
            </div>
          </div>

          <div
            role="group"
            aria-label="작업 종류"
            className="inline-flex shrink-0 rounded-xl border border-line bg-surface-2 p-0.5"
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={mode === m.value}
                onClick={() => setMode(m.value)}
                className={cx(
                  "h-8 rounded-[10px] px-3 text-sm font-medium transition-colors",
                  mode === m.value
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgb(43_38_34/0.08)]"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <span className="max-sm:hidden">{m.label}</span>
                <span className="sm:hidden">{m.short}</span>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {mode === "schedule" && (
              <button
                type="button"
                onClick={clearAll}
                disabled={schedules.length === 0}
                className={cx(btnGhost, "max-sm:hidden")}
              >
                <RotateCcw className="size-4" />
                초기화
              </button>
            )}
            <button
              type="button"
              onClick={niimbot.profile ? printCurrent : () => void niimbot.connect()}
              disabled={niimbotButtonDisabled(niimbot, jobCount)}
              title={
                !niimbot.supported
                  ? niimbot.embedded
                    ? "이 미리보기 창에서는 연결할 수 없습니다. Chrome 또는 Edge에서 여세요"
                    : "Chrome 또는 Edge에서 열어야 출력할 수 있습니다"
                  : niimbot.profile && jobCount === 0
                    ? mode === "schedule"
                      ? "백신을 선택하면 출력할 수 있습니다"
                      : "문구를 입력하면 출력할 수 있습니다"
                    : undefined
              }
              className={btnPrimary}
            >
              {mainButtonIcon}
              <span className="max-sm:hidden">{niimbotButtonLabel(niimbot, jobCount)}</span>
              <span className="sm:hidden">
                {niimbot.profile ? `${jobCount}장 출력` : "연결"}
              </span>
            </button>
          </div>
        </header>

        <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)_21rem]">
          <aside
            aria-label={mode === "schedule" ? "접종 예정일" : "자주 쓰는 문구"}
            className="border-b border-line bg-surface/70 lg:overflow-y-auto lg:border-r lg:border-b-0"
          >
            {mode === "schedule" ? (
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
            ) : (
              <TextTemplates
                templates={templates}
                activeId={activeTemplateId}
                canSave={hasText}
                currentText={text}
                onLoad={loadTemplate}
                onSave={saveTemplate}
                onDelete={deleteTemplate}
              />
            )}
          </aside>

          <main className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 lg:overflow-y-auto">
            <h1 className="sr-only">
              {mode === "schedule" ? "예방접종 스케줄" : "텍스트 라벨"}
            </h1>
            {mode === "schedule" ? (
              <>
                <StatTiles
                  dates={sorted.length}
                  vaccines={vaccineTotal}
                  labels={pages.length}
                />
                {selected ? (
                  <VaccinePanel
                    schedule={selected}
                    labelCount={labelCountByDate.get(selected.date) ?? 0}
                    vaccines={allVaccines}
                    customVaccines={customVaccines}
                    sets={sets}
                    onToggle={(vaccine) => toggleVaccine(selected.date, vaccine)}
                    onRemove={() => removeSchedule(selected.date)}
                    onApplySet={(set) => applySet(selected.date, set)}
                    onSaveSet={(name) => saveSet(selected.date, name)}
                    onDeleteSet={deleteSet}
                    onAddVaccine={addVaccine}
                    onDeleteVaccine={deleteVaccine}
                  />
                ) : (
                  <EmptyPanel hasDates={sorted.length > 0} />
                )}
              </>
            ) : (
              <TextEditor
                text={text}
                align={align}
                copies={copies}
                render={textRender}
                onTextChange={(value) => {
                  setText(value);
                  setActiveTemplateId(null);
                }}
                onAlignChange={setAlign}
                onCopiesChange={setCopies}
              />
            )}
          </main>

          <aside
            aria-label="라벨 미리보기"
            className="border-t border-line bg-surface/70 lg:min-h-0 lg:border-l lg:border-t-0"
          >
            <LabelTray
              count={jobCount}
              niimbot={niimbot}
              onPrint={printCurrent}
              onConnect={() => void niimbot.connect()}
            >
              {mode === "schedule" ? (
                <LabelPreview pages={pages} />
              ) : (
                <TextLabelPreview
                  canvas={textRender?.canvas ?? null}
                  empty={!hasText}
                  copies={copies}
                />
              )}
            </LabelTray>
          </aside>
        </div>
      </div>

      <LabelMeasure items={allVaccines} measureRef={measureRef} />
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
