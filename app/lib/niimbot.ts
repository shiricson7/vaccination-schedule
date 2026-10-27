"use client";

import { renderLabelCanvas, rotateForLeftFeed } from "./labelCanvas";
import { LABEL, type LabelPage } from "./labels";

/**
 * NIIMBOT 프린터로 USB(Web Serial) 직접 출력.
 * 프로토콜은 @mmote/niimbluelib (오픈소스 역공학 구현)을 쓰고, 버튼을 눌렀을 때만 내려받는다.
 */
type Lib = typeof import("@mmote/niimbluelib");
type SerialClient = import("@mmote/niimbluelib").NiimbotSerialClient;
type TaskName = import("@mmote/niimbluelib").PrintTaskName;
type PrintProgressEvent = import("@mmote/niimbluelib").PrintProgressEvent;

let libPromise: Promise<Lib> | null = null;
function loadLib(): Promise<Lib> {
  libPromise ??= import("@mmote/niimbluelib");
  return libPromise;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export type PrinterProfile = {
  model: string;
  dpi: number;
  printheadPixels: number;
  printDirection: "left" | "top";
  densityMin: number;
  densityMax: number;
  densityDefault: number;
  /** 라이브러리가 모델을 알아봤는지. 아니면 M2_H 값으로 출력한다. */
  recognized: boolean;
};

/** 모델을 못 알아봤을 때 쓰는 M2_H 값 (300dpi, 헤드 567px = 48mm, 위쪽 급지) */
const M2_H_PROFILE: PrinterProfile = {
  model: "M2_H",
  dpi: 300,
  printheadPixels: 567,
  printDirection: "top",
  densityMin: 1,
  densityMax: 5,
  densityDefault: 3,
  recognized: false,
};

export type NiimbotConnection = {
  client: SerialClient;
  profile: PrinterProfile;
  taskType: TaskName;
};

/** 포트 선택 대화상자를 띄우므로 반드시 클릭 핸들러 안에서 불러야 한다. */
export async function connectNiimbot(
  onDisconnect: () => void,
): Promise<NiimbotConnection> {
  const lib = await loadLib();
  const client = new lib.NiimbotSerialClient();
  client.on("disconnect", onDisconnect);
  await client.connect();

  const meta = client.getModelMetadata();
  const profile: PrinterProfile = meta
    ? {
        model: meta.model,
        dpi: meta.dpi,
        printheadPixels: meta.printheadPixels,
        printDirection: meta.printDirection,
        densityMin: meta.densityMin,
        densityMax: meta.densityMax,
        densityDefault: meta.densityDefault,
        recognized: true,
      }
    : M2_H_PROFILE;

  return { client, profile, taskType: client.getPrintTaskType() ?? "B1" };
}

export async function disconnectNiimbot(conn: NiimbotConnection): Promise<void> {
  try {
    await conn.client.disconnect();
  } catch {
    /* 이미 끊긴 포트 */
  }
}

export type PrintProgress = { page: number; total: number; percent: number };

export async function printLabels(
  conn: NiimbotConnection,
  pages: LabelPage[],
  options: { density: number; onProgress?: (p: PrintProgress) => void },
): Promise<void> {
  if (pages.length === 0) return;
  const lib = await loadLib();
  const { client, profile } = conn;

  const dpi = profile.dpi;
  const widthPx = Math.min(
    profile.printheadPixels,
    Math.round((LABEL.widthMm / 25.4) * dpi),
  );
  const heightPx = Math.round((LABEL.heightMm / 25.4) * dpi);
  const fontFamily = labelFontFamily();
  await ensureFontsLoaded(fontFamily);

  const density = Math.min(
    profile.densityMax,
    Math.max(profile.densityMin, Math.round(options.density)),
  );
  const task = client.protocol.newPrintTask(conn.taskType, {
    totalPages: pages.length,
    labelType: lib.LabelType.WithGaps,
    density,
    statusPollIntervalMs: 100,
    statusTimeoutMs: 15_000,
    pageTimeoutMs: 15_000,
  });

  const report = (page: number, percent: number) =>
    options.onProgress?.({ page, total: pages.length, percent });
  const onProgress = (e: PrintProgressEvent) =>
    report(
      Math.min(pages.length, e.page + 1),
      Math.round((e.pagePrintProgress + e.pageFeedProgress) / 2),
    );
  client.on("printprogress", onProgress);

  try {
    await task.printInit();
    for (let i = 0; i < pages.length; i++) {
      report(i + 1, 0);
      let canvas = renderLabelCanvas(pages[i], {
        dpi,
        widthPx,
        heightPx,
        labelWidthMm: LABEL.widthMm,
        labelHeightMm: LABEL.heightMm,
        fontFamily,
      });
      if (profile.printDirection === "left") canvas = rotateForLeftFeed(canvas);
      const encoded = lib.ImageEncoder.encodeCanvas(
        canvas,
        lib.PageColorType.SingleColor,
        profile.printDirection,
      );
      await task.printPage(encoded, 1);
      await task.waitForPageFinished();
    }
    await task.waitForFinished();
    report(pages.length, 100);
  } finally {
    client.off("printprogress", onProgress);
    await task.printEnd().catch(() => undefined);
  }
}

/** 화면과 같은 글꼴(next/font의 IBM Plex Sans KR)을 캔버스에서도 쓴다. */
function labelFontFamily(): string {
  const fromCss = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-plex-sans")
    .trim();
  return fromCss
    ? `${fromCss}, "IBM Plex Sans KR", sans-serif`
    : '"IBM Plex Sans KR", sans-serif';
}

async function ensureFontsLoaded(fontFamily: string): Promise<void> {
  const first = fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
  const sample = "예방접종 안내 2026.01.01 (월) DTaP";
  try {
    await Promise.all(
      [500, 600, 700].map((weight) =>
        document.fonts.load(`${weight} 24px "${first}"`, sample),
      ),
    );
    await document.fonts.ready;
  } catch {
    /* 글꼴 로드 실패 시 대체 글꼴로 진행 */
  }
}

/** 사용자에게 보여 줄 오류 문구 */
export function describeNiimbotError(error: unknown): string {
  const e = error as { name?: string; message?: string; reasonId?: number };
  const message = e?.message ?? String(error);
  switch (e?.name) {
    case "NotFoundError":
      return "포트를 선택하지 않았습니다. 다시 연결을 눌러 프린터의 COM 포트를 고르세요.";
    case "SecurityError":
      return "브라우저가 포트 접근을 막았습니다. 버튼을 직접 눌러 연결해 주세요.";
    case "NetworkError":
    case "InvalidStateError":
      return "포트를 열 수 없습니다. NIIMBOT 앱 등 다른 프로그램이 프린터를 쓰고 있는지 확인하세요.";
  }
  if (/timeout|time out/i.test(message)) {
    return "프린터가 응답하지 않습니다. 전원과 USB 연결을 확인한 뒤 다시 연결하세요.";
  }
  if (typeof e?.reasonId === "number") {
    return `프린터 오류 (${message}). 라벨·리본이 정품인지, 덮개가 닫혔는지 확인하세요.`;
  }
  return message || "알 수 없는 오류가 났습니다.";
}

// 개발 중 실제 프린터 테스트용: 렌더 결과를 콘솔/스크립트에서 꺼내 볼 수 있게 한다.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as { __renderLabelCanvas?: typeof renderLabelCanvas }).__renderLabelCanvas =
    renderLabelCanvas;
}
