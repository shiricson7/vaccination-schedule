"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import type { TextTemplate } from "./text";
import type { VaccineSet } from "./vaccines";

const PREFIX = "vaccination-schedule.";

/** localStorage 키. 형식이 바뀌면 버전을 올린다. */
export const STORAGE_KEYS = {
  customVaccines: `${PREFIX}custom-vaccines.v1`,
  sets: `${PREFIX}sets.v1`,
  niimbotDensity: `${PREFIX}niimbot-density.v1`,
  textTemplates: `${PREFIX}text-templates.v1`,
} as const;

/** 기본값은 렌더마다 같은 객체여야 하므로 모듈 상수로 둔다. */
export const EMPTY_STRINGS: string[] = [];
export const EMPTY_SETS: VaccineSet[] = [];
export const EMPTY_TEMPLATES: TextTemplate[] = [];
/** NIIMBOT 인쇄 진하기 기본값 (M2_H 기본 3) */
export const DEFAULT_DENSITY = 3;

/** localStorage를 못 쓸 때(사설 모드, 차단) 페이지가 열려 있는 동안만 기억하는 대체 저장소 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 저장 실패(용량 초과, 차단)는 메모리 값으로 동작 */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바꾼 값도 따라간다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

function decode<T>(
  raw: string | null,
  parse: (raw: unknown) => T | null,
  initial: T,
): T {
  if (raw === null) return initial;
  try {
    return parse(JSON.parse(raw)) ?? initial;
  } catch {
    return initial;
  }
}

/**
 * 이 브라우저에 남는 상태. 서버 렌더와 하이드레이션은 기본값으로 그리고,
 * 그 뒤 저장값으로 바뀐다. `initial`과 `parse`는 렌더마다 같은 값이어야 한다.
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | null,
): [T, (update: SetStateAction<T>) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    getServerSnapshot,
  );

  const value = useMemo(() => decode(raw, parse, initial), [raw, parse, initial]);

  const setValue = useCallback(
    (update: SetStateAction<T>) => {
      const current = decode(readRaw(key), parse, initial);
      const next =
        typeof update === "function"
          ? (update as (prev: T) => T)(current)
          : update;
      writeRaw(key, JSON.stringify(next));
    },
    [key, parse, initial],
  );

  return [value, setValue];
}

export function parseStringList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
}

export function parseDensity(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 15
    ? raw
    : null;
}

export function parseSets(raw: unknown): VaccineSet[] | null {
  if (!Array.isArray(raw)) return null;
  const sets: VaccineSet[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, name, vaccines } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string") continue;
    if (!Array.isArray(vaccines)) continue;
    sets.push({
      id,
      name,
      vaccines: vaccines.filter((v): v is string => typeof v === "string"),
    });
  }
  return sets;
}

export function parseTemplates(raw: unknown): TextTemplate[] | null {
  if (!Array.isArray(raw)) return null;
  const templates: TextTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, name, text, align } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string") continue;
    if (typeof text !== "string") continue;
    templates.push({
      id,
      name,
      text,
      align: align === "left" ? "left" : "center",
    });
  }
  return templates;
}
