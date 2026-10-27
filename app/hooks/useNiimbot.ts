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

/** 같은 사이트의 다른 탭과 포트 소유권을 나누는 Web Locks 이름 */
const PORT_LOCK = "niimbot-serial-port";
const OTHER_TAB_MESSAGE =
  "이 앱이 열린 다른 탭이 프린터에 연결되어 있습니다. 프린터는 한 탭에서만 쓸 수 있으니 그 탭을 닫거나 거기서 연결 해제한 뒤 다시 시도하세요.";

/*
 * 연결은 페이지에 하나뿐이므로 공유 상태로 둔다. 모듈이 아니라 globalThis에 두는 이유는
 * 개발 서버의 코드 갱신(HMR)으로 모듈이 다시 실행돼도 이미 열린 포트를 잃지 않기 위해서다.
 * 컴포넌트가 다시 마운트되거나(StrictMode 이중 마운트) 리렌더돼도 포트를 끊거나 두 번
 * 열지 않는다. 페이지를 닫으면 브라우저가 포트와 잠금을 정리한다.
 */
type Shared = {
  connection: NiimbotConnection | null;
  listeners: Set<() => void>;
  /** 진행 중인 연결 시도. 겹치는 요청은 같은 시도를 기다린다. */
  pending: Promise<NiimbotConnection> | null;
  /** 페이지당 자동 연결은 한 번만 시도한다. */
  autoConnectTried: boolean;
  /** 잡고 있는 탭 간 잠금을 푸는 함수 */
  releaseLock: (() => void) | null;
};

const shared: Shared = ((globalThis as { __niimbotShared?: Shared }).__niimbotShared ??= {
  connection: null,
  listeners: new Set(),
  pending: null,
  autoConnectTried: false,
  releaseLock: null,
});

function setConnection(conn: NiimbotConnection | null) {
  shared.connection = conn;
  shared.listeners.forEach((listener) => listener());
}
function subscribeConnection(listener: () => void) {
  shared.listeners.add(listener);
  return () => {
    shared.listeners.delete(listener);
  };
}
const getConnection = () => shared.connection;
const getNoConnection = () => null;

/**
 * 같은 사이트의 다른 탭이 프린터를 쓰고 있지 않을 때만 잠금을 잡는다.
 * Web Locks가 없는 브라우저에서는 그냥 진행한다.
 */
function acquirePortLock(): Promise<boolean> {
  if (shared.releaseLock) return Promise.resolve(true);
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return Promise.resolve(true);
  }
  return new Promise<boolean>((resolve) => {
    void navigator.locks
      .request(PORT_LOCK, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        // 이 프로미스가 끝날 때까지 잠금이 유지된다.
        return new Promise<void>((release) => {
          shared.releaseLock = () => {
            shared.releaseLock = null;
            release();
          };
          resolve(true);
        });
      })
      .catch(() => resolve(true));
  });
}

function releasePortLock() {
  shared.releaseLock?.();
}

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
  const [status, setStatus] = useState<NiimbotStatus>(() =>
    shared.connection ? connectedStatus(shared.connection) : { kind: "idle" },
  );
  const [density, setDensity] = useStoredState(
    STORAGE_KEYS.niimbotDensity,
    DEFAULT_DENSITY,
    parseDensity,
  );

  /**
   * 포트를 연다. 이미 연결돼 있으면 그 연결을, 진행 중이면 그 시도를 돌려준다.
   * 다른 탭이 프린터를 쓰고 있으면 OTHER_TAB_MESSAGE 오류를 던진다.
   */
  const open = useCallback((port?: SerialPort) => {
    if (shared.connection) return Promise.resolve(shared.connection);
    shared.pending ??= (async () => {
      if (!(await acquirePortLock())) throw new Error(OTHER_TAB_MESSAGE);
      try {
        const c = await connectNiimbot(() => {
          // 프린터 쪽에서 끊김 (USB 뽑힘, 전원 꺼짐)
          if (shared.connection) {
            setConnection(null);
            releasePortLock();
            setStatus({ kind: "idle", notice: "프린터 연결이 끊어졌습니다." });
          }
        }, port);
        setConnection(c);
        return c;
      } catch (error) {
        releasePortLock();
        throw error;
      }
    })().finally(() => {
      shared.pending = null;
    });
    return shared.pending;
  }, []);

  const connect = useCallback(
    async (options?: { chooser?: boolean }) => {
      if (shared.connection) return;
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
    if (!supported || shared.autoConnectTried || shared.connection) return;
    shared.autoConnectTried = true;
    void (async () => {
      const port = await findAuthorizedPort();
      if (!port) return;
      setStatus({ kind: "connecting" });
      try {
        setStatus(connectedStatus(await open(port)));
      } catch (error) {
        const message = describeNiimbotError(error);
        setStatus({
          kind: "idle",
          notice:
            message === OTHER_TAB_MESSAGE
              ? "다른 탭이 프린터를 쓰고 있어 이 탭에서는 연결하지 않았습니다."
              : `자동 연결에 실패했습니다. ${message}`,
        });
      }
    })();
  }, [supported, open]);

  const disconnect = useCallback(async () => {
    const current = shared.connection;
    setConnection(null);
    if (current) await disconnectNiimbot(current);
    releasePortLock();
    setStatus({ kind: "idle" });
  }, []);

  const print = useCallback(
    async (jobs: JobsFactory) => {
      const current = shared.connection;
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
        if (!current.client.isConnected()) {
          setConnection(null);
          releasePortLock();
        }
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
