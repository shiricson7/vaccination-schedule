// Web Serial API 타입(SerialPort, navigator.serial). TypeScript 6부터 @types가 자동으로
// 포함되지 않아 여기서 참조한다. 삼중 슬래시 지시문은 파일 맨 위에 있어야 하며
// 프로그램 전체에 전역으로 적용된다.
/// <reference types="w3c-web-serial" />
"use client";

import {
  renderLabelCanvas,
  renderTextLabelCanvas,
  rotateForLeftFeed,
  type TextAlign,
} from "./labelCanvas";
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

/**
 * Claude 앱의 미리보기 창 같은 임베디드 브라우저. Web Serial API는 있지만
 * 포트 선택 창을 띄울 수 없어 연결이 항상 실패한다.
 */
export function isEmbeddedBrowser(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /\b(Claude|Electron)\//.test(navigator.userAgent)
  );
}

/** NIIMBOT 프린터의 USB 제조사 ID */
const NIIMBOT_VENDOR_ID = 0x3513;

/**
 * 이 사이트에 이미 허용된 포트 중 NIIMBOT을 찾는다. 선택 창 없이 바로 열 수 있다.
 * NIIMBOT이 없고 허용된 포트가 하나뿐이면 그 포트를 쓴다.
 */
export async function findAuthorizedPort(): Promise<SerialPort | null> {
  if (!isWebSerialSupported()) return null;
  try {
    const ports = await navigator.serial.getPorts();
    const niimbot = ports.find(
      (p) => p.getInfo().usbVendorId === NIIMBOT_VENDOR_ID,
    );
    return niimbot ?? (ports.length === 1 ? ports[0] : null);
  } catch {
    return null;
  }
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

/** 모델을 못 알아봤을 때(그리고 연결 전 미리보기에) 쓰는 M2_H 값: 300dpi, 헤드 567px = 48mm, 위쪽 급지 */
export const M2_H_PROFILE: PrinterProfile = {
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

/** 인쇄 작업 하나: 비트맵과 장수 */
export type PrintJob = { canvas: HTMLCanvasElement; quantity: number };

export type PrintProgress = { page: number; total: number; percent: number };

/** 프린터 프로필에 맞는 캔버스 크기 (헤드 폭을 넘지 않는 라벨 폭 × 라벨 높이) */
export function canvasSizeFor(profile: PrinterProfile) {
  const dpi = profile.dpi;
  return {
    dpi,
    widthPx: Math.min(
      profile.printheadPixels,
      Math.round((LABEL.widthMm / 25.4) * dpi),
    ),
    heightPx: Math.round((LABEL.heightMm / 25.4) * dpi),
    labelWidthMm: LABEL.widthMm,
    labelHeightMm: LABEL.heightMm,
  };
}

/**
 * 프린터에 연결한다. `port`를 주면(이미 허용된 포트) 선택 창 없이 바로 열고,
 * 없으면 포트 선택 창을 띄우므로 그때는 반드시 클릭 핸들러 안에서 불러야 한다.
 */
export async function connectNiimbot(
  onDisconnect: () => void,
  port?: SerialPort,
): Promise<NiimbotConnection> {
  const lib = await loadLib();
  const client = new lib.NiimbotSerialClient();
  client.on("disconnect", onDisconnect);
  await client.connect(port ? { authorizedPort: port } : undefined);

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

/** 작업 목록을 한 번의 인쇄로 보낸다. 장수 합이 총 페이지 수. */
export async function printJobs(
  conn: NiimbotConnection,
  jobs: PrintJob[],
  options: { density: number; onProgress?: (p: PrintProgress) => void },
): Promise<void> {
  const total = jobs.reduce((n, j) => n + j.quantity, 0);
  if (total === 0) return;
  const lib = await loadLib();
  const { client, profile } = conn;

  const density = Math.min(
    profile.densityMax,
    Math.max(profile.densityMin, Math.round(options.density)),
  );
  const task = client.protocol.newPrintTask(conn.taskType, {
    totalPages: total,
    labelType: lib.LabelType.WithGaps,
    density,
    statusPollIntervalMs: 100,
    statusTimeoutMs: 15_000,
    pageTimeoutMs: 15_000,
  });

  const report = (page: number, percent: number) =>
    options.onProgress?.({ page, total, percent });
  const onProgress = (e: PrintProgressEvent) =>
    report(
      Math.min(total, e.page + 1),
      Math.round((e.pagePrintProgress + e.pageFeedProgress) / 2),
    );
  client.on("printprogress", onProgress);

  let done = 0;
  try {
    await task.printInit();
    for (const job of jobs) {
      report(done + 1, 0);
      const canvas =
        profile.printDirection === "left"
          ? rotateForLeftFeed(job.canvas)
          : job.canvas;
      const encoded = lib.ImageEncoder.encodeCanvas(
        canvas,
        lib.PageColorType.SingleColor,
        profile.printDirection,
      );
      await task.printPage(encoded, job.quantity);
      await task.waitForPageFinished();
      done += job.quantity;
    }
    await task.waitForFinished();
    report(total, 100);
  } finally {
    client.off("printprogress", onProgress);
    await task.printEnd().catch(() => undefined);
  }
}

/** 접종 안내 라벨: 페이지마다 1장 */
export async function buildScheduleJobs(
  pages: LabelPage[],
  profile: PrinterProfile,
): Promise<PrintJob[]> {
  const size = canvasSizeFor(profile);
  const fontFamily = labelFontFamily();
  await ensureFontsLoaded(fontFamily);
  return pages.map((page) => ({
    canvas: renderLabelCanvas(page, { ...size, fontFamily }),
    quantity: 1,
  }));
}

/** 텍스트 라벨: 같은 문구를 copies 장 */
export async function buildTextJob(
  text: string,
  align: TextAlign,
  copies: number,
  profile: PrinterProfile,
): Promise<PrintJob[]> {
  if (text.trim() === "" || copies < 1) return [];
  const size = canvasSizeFor(profile);
  const fontFamily = labelFontFamily();
  await ensureFontsLoaded(fontFamily);
  const { canvas } = renderTextLabelCanvas({ ...size, fontFamily, text, align });
  return [{ canvas, quantity: Math.round(copies) }];
}

/** 화면과 같은 글꼴(next/font의 IBM Plex Sans KR)을 캔버스에서도 쓴다. */
export function labelFontFamily(): string {
  const fromCss = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-plex-sans")
    .trim();
  return fromCss
    ? `${fromCss}, "IBM Plex Sans KR", sans-serif`
    : '"IBM Plex Sans KR", sans-serif';
}

export async function ensureFontsLoaded(fontFamily: string): Promise<void> {
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
      // 선택 창에서 고르지 않고 닫았을 때
      return "포트를 고르지 않았습니다. 다시 누른 뒤 연결 창에서 'USB 직렬 장치 (COMx)'를 선택하고 '연결'을 누르세요.";
    case "SecurityError":
      return "브라우저가 포트 접근을 막았습니다. 버튼을 직접 눌러 연결해 주세요.";
    case "InvalidStateError":
      return "포트가 이미 열려 있습니다. 이 앱이 열린 다른 탭이나 창을 닫은 뒤 페이지를 새로 고치고 다시 연결하세요.";
    case "NetworkError":
      return "포트를 열 수 없습니다. ① 이 앱이 다른 탭(예: 로컬 주소와 배포 주소를 같이 열어 둔 경우)에 열려 있으면 그 탭을 닫고, ② NIIMBOT 앱 등 다른 프로그램이 프린터를 쓰고 있으면 끝내고, ③ 프린터 전원과 USB를 확인한 뒤 다시 연결하세요.";
  }
  if (/timeout|time out/i.test(message)) {
    return "프린터가 응답하지 않습니다. 전원이 켜져 있는지, USB가 꽂혀 있는지 확인한 뒤 다시 연결하세요.";
  }
  if (typeof e?.reasonId === "number") {
    return `프린터 오류 (${message}). 라벨·리본이 정품인지, 덮개가 닫혔는지 확인하세요.`;
  }
  return message || "알 수 없는 오류가 났습니다.";
}

// 개발 중 실제 프린터 테스트용: 렌더 결과를 콘솔/스크립트에서 꺼내 볼 수 있게 한다.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const w = window as unknown as {
    __renderLabelCanvas?: typeof renderLabelCanvas;
    __renderTextLabelCanvas?: typeof renderTextLabelCanvas;
  };
  w.__renderLabelCanvas = renderLabelCanvas;
  w.__renderTextLabelCanvas = renderTextLabelCanvas;
}
