"use client";

import { Cable, LoaderCircle, Printer, Unplug } from "lucide-react";
import type { UseNiimbot } from "../hooks/useNiimbot";
import { cx } from "../lib/cx";
import { btnGhost, btnPrimary } from "../lib/ui";

type Props = {
  niimbot: UseNiimbot;
  /** 지금 출력하면 나갈 장수 */
  jobCount: number;
  onPrint: () => void;
  onConnect: () => void;
};

/** 헤더·트레이 주 버튼에 쓰는 문구 */
export function niimbotButtonLabel(niimbot: UseNiimbot, jobCount: number): string {
  const { status, profile } = niimbot;
  if (status.kind === "connecting") return "연결 중…";
  if (status.kind === "printing") {
    return status.total > 0 ? `${status.page}/${status.total}장 인쇄 중` : "준비 중…";
  }
  if (!profile) return "NIIMBOT 연결";
  return jobCount > 0 ? `NIIMBOT로 ${jobCount}장 출력` : "출력할 라벨 없음";
}

/** 주 버튼을 눌렀을 때 할 일: 연결 전이면 연결, 연결됐으면 출력 */
export function niimbotButtonDisabled(niimbot: UseNiimbot, jobCount: number): boolean {
  return (
    !niimbot.supported ||
    niimbot.busy ||
    (niimbot.profile !== null && jobCount === 0)
  );
}

/** 프린터 트레이 아래쪽: 연결 상태, 진하기, 진행률, 오류 */
export function NiimbotPanel({ niimbot, jobCount, onPrint, onConnect }: Props) {
  const { supported, status, profile, busy, density, setDensity } = niimbot;

  return (
    <section aria-labelledby="niimbot-heading" className="border-t border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="niimbot-heading" className="eyebrow">
          NIIMBOT 프린터
        </h3>
        <span
          className={cx(
            "font-mono text-xs tabular-nums",
            profile ? "text-mint-ink" : "text-ink-muted",
          )}
        >
          {profile ? `${profile.model} · ${profile.dpi}dpi · 연결됨` : "연결 안 됨"}
        </span>
      </div>

      {!supported ? (
        <p className="mt-2 text-xs text-ink-muted">
          Chrome 또는 Edge에서 이 주소를 열어야 USB로 연결한 NIIMBOT에 출력할 수 있습니다.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={profile ? onPrint : onConnect}
              disabled={niimbotButtonDisabled(niimbot, jobCount)}
              className={cx(btnPrimary, "h-10 flex-1")}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : profile ? (
                <Printer className="size-4" />
              ) : (
                <Cable className="size-4" />
              )}
              {niimbotButtonLabel(niimbot, jobCount)}
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => void niimbot.disconnect()}
                disabled={busy}
                aria-label="프린터 연결 해제"
                title="연결 해제"
                className={cx(btnGhost, "w-10 px-0")}
              >
                <Unplug className="size-4" />
              </button>
            )}
          </div>

          {profile && (
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
          )}

          {status.kind === "printing" && status.total > 0 && (
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
          {status.kind === "idle" && status.notice && (
            <p className="text-xs text-ink-muted">{status.notice}</p>
          )}
          {status.kind === "error" && (
            <p role="alert" className="text-xs text-danger">
              {status.message}
            </p>
          )}
          {!profile && status.kind === "idle" && !status.notice && (
            <p className="text-xs text-ink-muted">
              프린터를 켜고 USB를 꽂은 뒤 누르면 포트 선택 창이 뜹니다. &apos;USB 직렬 장치
              (COMx)&apos;를 고르세요. 창이 안 뜨면 Chrome/Edge에서 이 주소를 직접 여세요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
