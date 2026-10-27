"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  connectNiimbot,
  describeNiimbotError,
  disconnectNiimbot,
  findAuthorizedPort,
  isEmbeddedBrowser,
  isWebSerialSupported,
  printJobs,
  type NiimbotConnection,
  type PrinterProfile,
  type PrintJob,
} from "../lib/niimbot";
import {
  DEFAULT_DENSITY,
  parseDensity,
  STORAGE_KEYS,
  useStoredState,
} from "../lib/storage";

export type NiimbotStatus =
  | { kind: "idle"; notice?: string }
  | { kind: "connecting" }
  | { kind: "connected"; notice?: string }
  | { kind: "printing"; page: number; total: number; percent: number }
  | { kind: "error"; message: string };

/** 프린터 프로필을 받아 인쇄 작업을 만든다 (연결된 뒤에야 프로필을 알 수 있다) */
export type JobsFactory = (
  profile: PrinterProfile,
) => Promise<PrintJob[]> | PrintJob[];

export type UseNiimbot = {
  /** 이 브라우저에서 USB 연결이 가능한지 (Web Serial 지원 + 임베디드 창 아님) */
  supported: boolean;
  /** Claude 앱 미리보기 창처럼 포트 선택 창을 못 띄우는 환경 */
  embedded: boolean;
  status: NiimbotStatus;
  /** 연결된 프린터. null이면 연결 안 됨 */
  profile: PrinterProfile | null;
  busy: boolean;
  density: number;
  setDensity: (density: number) => void;
  /** 허용된 포트가 있으면 바로, 없으면 선택 창으로 연결. chooser=true면 항상 선택 창 */
  connect: (options?: { chooser?: boolean }) => Promise<void>;
  disconnect: () => Promise<void>;
  print: (jobs: JobsFactory) => Promise<void>;
};

const noSubscribe = () => () => {};
const getSupported = () => isWebSerialSupported() && !isEmbeddedBrowser();
const getEmbedded = () => isWebSerialSupported() && isEmbeddedBrowser();

/*
 * 연결은 페이지에 하나뿐이므로 모듈 싱글턴으로 둔다. 컴포넌트가 다시 마운트되거나
 * (개발 모드 StrictMode의 이중 마운트 등) 리렌더돼도 포트를 끊거나 두 번 열지 않는다.
 * 페이지를 닫으면 브라우저가 포트를 닫는다.
 */
const connection = {
  current: null as NiimbotConnection | null,
  listeners: new Set<() => void>(),
};
function setConnection(conn: NiimbotConnection | null) {
  connection.current = conn;
  connection.listeners.forEach((listener) => listener());
}
function subscribeConnection(listener: () => void) {
  connection.listeners.add(listener);
  return () => {
    connection.listeners.delete(listener);
  };
}
const getConnection = () => connection.current;
const getNoConnection = () => null;

/** 진행 중인 연결 시도. 겹치는 요청은 같은 시도를 기다린다. */
let pendingConnect: Promise<NiimbotConnection> | null = null;
/** 페이지당 자동 연결은 한 번만 시도한다. */
let autoConnectTried = false;

function connectedStatus(conn: NiimbotConnection): NiimbotStatus {
  return {
    kind: "connected",
    notice: conn.profile.recognized
      ? undefined
      : "모델을 알아보지 못해 M2_H 설정(300dpi)으로 출력합니다.",
  };
}

/** 앱 전체가 공유하는 NIIMBOT 연결 상태 */
export function useNiimbot(): UseNiimbot {
  // 서버 렌더에서는 false, 브라우저에서 실제 지원 여부로 바뀐다.
  const supported = useSyncExternalStore(noSubscribe, getSupported, () => false);
  const embedded = useSyncExternalStore(noSubscribe, getEmbedded, () => false);
  const conn = useSyncExternalStore(subscribeConnection, getConnection, getNoConnection);
  const [status, setStatus] = useState<NiimbotStatus>({ kind: "idle" });
  const [density, setDensity] = useStoredState(
    STORAGE_KEYS.niimbotDensity,
    DEFAULT_DENSITY,
    parseDensity,
  );

  /** 포트를 연다. 이미 연결돼 있으면 그 연결을, 진행 중이면 그 시도를 돌려준다. */
  const open = useCallback((port?: SerialPort) => {
    if (connection.current) return Promise.resolve(connection.current);
    pendingConnect ??= connectNiimbot(() => {
      // 프린터 쪽에서 끊김 (USB 뽑힘, 전원 꺼짐)
      if (connection.current) {
        setConnection(null);
        setStatus({ kind: "idle", notice: "프린터 연결이 끊어졌습니다." });
      }
    }, port)
      .then((c) => {
        setConnection(c);
        return c;
      })
      .finally(() => {
        pendingConnect = null;
      });
    return pendingConnect;
  }, []);

  const connect = useCallback(
    async (options?: { chooser?: boolean }) => {
      if (connection.current) return;
      setStatus({ kind: "connecting" });
      try {
        const port = options?.chooser ? null : await findAuthorizedPort();
        setStatus(connectedStatus(await open(port ?? undefined)));
      } catch (error) {
        setStatus({ kind: "error", message: describeNiimbotError(error) });
      }
    },
    [open],
  );

  // 페이지를 열 때 이미 허용된 NIIMBOT 포트가 있으면 조용히 연결한다.
  useEffect(() => {
    if (!supported || autoConnectTried || connection.current) return;
    autoConnectTried = true;
    void (async () => {
      const port = await findAuthorizedPort();
      if (!port) return;
      setStatus({ kind: "connecting" });
      try {
        setStatus(connectedStatus(await open(port)));
      } catch (error) {
        setStatus({
          kind: "idle",
          notice: `자동 연결에 실패했습니다. ${describeNiimbotError(error)}`,
        });
      }
    })();
  }, [supported, open]);

  const disconnect = useCallback(async () => {
    const current = connection.current;
    setConnection(null);
    if (current) await disconnectNiimbot(current);
    setStatus({ kind: "idle" });
  }, []);

  const print = useCallback(
    async (jobs: JobsFactory) => {
      const current = connection.current;
      if (!current) return;
      setStatus({ kind: "printing", page: 1, total: 0, percent: 0 });
      try {
        const list = await jobs(current.profile);
        const total = list.reduce((n, j) => n + j.quantity, 0);
        if (total === 0) {
          setStatus({ kind: "connected" });
          return;
        }
        setStatus({ kind: "printing", page: 1, total, percent: 0 });
        await printJobs(current, list, {
          density,
          onProgress: (p) =>
            setStatus({ kind: "printing", page: p.page, total: p.total, percent: p.percent }),
        });
        setStatus({ kind: "connected", notice: `라벨 ${total}장을 보냈습니다.` });
      } catch (error) {
        if (!current.client.isConnected()) setConnection(null);
        setStatus({ kind: "error", message: describeNiimbotError(error) });
      }
    },
    [density],
  );

  return {
    supported,
    embedded,
    status,
    profile: conn?.profile ?? null,
    busy: status.kind === "connecting" || status.kind === "printing",
    density,
    setDensity,
    connect,
    disconnect,
    print,
  };
}
