"use client";

import { Cable, LoaderCircle, Printer, Unplug } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "../lib/cx";
import type { LabelPage } from "../lib/labels";
import {
  connectNiimbot,
  describeNiimbotError,
  disconnectNiimbot,
  isWebSerialSupported,
  printLabels,
  type NiimbotConnection,
  type PrinterProfile,
} from "../lib/niimbot";
import {
  DEFAULT_DENSITY,
  parseDensity,
  STORAGE_KEYS,
  useStoredState,
} from "../lib/storage";
import { btnGhost, btnPrimary, btnSecondary } from "../lib/ui";

type Status =
  | { kind: "idle"; notice?: string }
  | { kind: "connecting" }
  | { kind: "connected"; profile: PrinterProfile; notice?: string }
  | { kind: "printing"; profile: PrinterProfile; page: number; total: number; percent: number }
  | { kind: "error"; message: string; profile?: PrinterProfile };

const noop = () => () => {};

/** 프린터 트레이 아래쪽: NIIMBOT USB 직접 출력 */
export function NiimbotPrint({ pages }: { pages: LabelPage[] }) {
  // 서버 렌더에서는 false, 브라우저에서 Web Serial 지원 여부로 바뀐다.
  const supported = useSyncExternalStore(noop, isWebSerialSupported, () => false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [density, setDensity] = useStoredState(
    STORAGE_KEYS.niimbotDensity,
    DEFAULT_DENSITY,
    parseDensity,
  );
  const connRef = useRef<NiimbotConnection | null>(null);

  useEffect(() => {
    return () => {
      const conn = connRef.current;
      connRef.current = null;
      if (conn) void disconnectNiimbot(conn);
    };
  }, []);

  const connect = async () => {
    setStatus({ kind: "connecting" });
    try {
      const conn = await connectNiimbot(() => {
        if (connRef.current !== null) {
          connRef.current = null;
          setStatus({ kind: "idle", notice: "프린터 연결이 끊어졌습니다." });
        }
      });
      connRef.current = conn;
      setStatus({
        kind: "connected",
        profile: conn.profile,
        notice: conn.profile.recognized
          ? undefined
          : "모델을 알아보지 못해 M2_H 설정(300dpi)으로 출력합니다.",
      });
    } catch (error) {
      connRef.current = null;
      setStatus({ kind: "error", message: describeNiimbotError(error) });
    }
  };

  const disconnect = async () => {
    const conn = connRef.current;
    connRef.current = null;
    if (conn) await disconnectNiimbot(conn);
    setStatus({ kind: "idle" });
  };

  const print = async () => {
    const conn = connRef.current;
    if (!conn || pages.length === 0) return;
    const { profile } = conn;
    setStatus({ kind: "printing", profile, page: 1, total: pages.length, percent: 0 });
    try {
      await printLabels(conn, pages, {
        density,
        onProgress: (p) =>
          setStatus({ kind: "printing", profile, page: p.page, total: p.total, percent: p.percent }),
      });
      setStatus({ kind: "connected", profile, notice: `라벨 ${pages.length}장을 보냈습니다.` });
    } catch (error) {
      setStatus({
        kind: "error",
        message: describeNiimbotError(error),
        profile: conn.client.isConnected() ? profile : undefined,
      });
      if (!conn.client.isConnected()) connRef.current = null;
    }
  };

  const profile =
    status.kind === "connected" || status.kind === "printing" || status.kind === "error"
      ? status.profile
      : undefined;
  const busy = status.kind === "connecting" || status.kind === "printing";

  return (
    <section aria-labelledby="niimbot-heading" className="mt-4 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="niimbot-heading" className="eyebrow">
          NIIMBOT 직접 출력
        </h3>
        {profile && (
          <span className="font-mono text-xs text-ink-muted tabular-nums">
            {profile.model} · {profile.dpi}dpi
          </span>
        )}
      </div>

      {!supported ? (
        <p className="mt-2 text-xs text-ink-muted">
          Chrome 또는 Edge에서 열면 USB로 연결한 NIIMBOT에 인쇄 대화상자 없이 바로 출력할 수
          있습니다.
        </p>
      ) : profile ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={print}
              disabled={busy || pages.length === 0}
              className={cx(btnPrimary, "h-10 flex-1")}
            >
              {status.kind === "printing" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              {status.kind === "printing"
                ? `${status.page}/${status.total}장 인쇄 중`
                : pages.length > 0
                  ? `NIIMBOT로 ${pages.length}장 출력`
                  : "NIIMBOT로 출력"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              aria-label="프린터 연결 해제"
              title="연결 해제"
              className={cx(btnGhost, "w-10 px-0")}
            >
              <Unplug className="size-4" />
            </button>
          </div>

          <label className="flex items-center justify-between gap-3 text-xs text-ink-muted">
            <span>진하기</span>
            <select
              value={Math.min(profile.densityMax, Math.max(profile.densityMin, density))}
              onChange={(e) => setDensity(Number(e.target.value))}
              disabled={busy}
              className="h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs text-ink"
            >
              {Array.from(
                { length: profile.densityMax - profile.densityMin + 1 },
                (_, i) => profile.densityMin + i,
              ).map((d) => (
                <option key={d} value={d}>
                  {d}
                  {d === profile.densityDefault ? " (기본)" : ""}
                </option>
              ))}
            </select>
          </label>

          {status.kind === "printing" && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status.percent}
              aria-label={`${status.page}/${status.total}장 인쇄 진행률`}
              className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${status.percent}%` }}
              />
            </div>
          )}
          {status.kind === "connected" && status.notice && (
            <p className="text-xs text-mint-ink">{status.notice}</p>
          )}
          {status.kind === "error" && (
            <p role="alert" className="text-xs text-danger">
              {status.message}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className={cx(btnSecondary, "w-full")}
          >
            {status.kind === "connecting" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Cable className="size-4" />
            )}
            {status.kind === "connecting" ? "연결 중…" : "NIIMBOT 연결"}
          </button>
          {status.kind === "error" ? (
            <p role="alert" className="text-xs text-danger">
              {status.message}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              {status.kind === "idle" && status.notice
                ? status.notice
                : "프린터를 켜고 USB를 꽂은 뒤 누르면 포트 선택 창이 뜹니다. 'USB 직렬 장치 (COMx)'를 고르세요. 창이 안 뜨면 Chrome/Edge에서 이 주소를 직접 여세요."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
