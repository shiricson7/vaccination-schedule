"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  connectNiimbot,
  describeNiimbotError,
  disconnectNiimbot,
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
  /** 이 브라우저가 Web Serial을 지원하는지 */
  supported: boolean;
  status: NiimbotStatus;
  /** 연결된 프린터. null이면 연결 안 됨 */
  profile: PrinterProfile | null;
  busy: boolean;
  density: number;
  setDensity: (density: number) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  print: (jobs: JobsFactory) => Promise<void>;
};

const noSubscribe = () => () => {};

/** 앱 전체가 공유하는 NIIMBOT 연결 상태 */
export function useNiimbot(): UseNiimbot {
  // 서버 렌더에서는 false, 브라우저에서 Web Serial 지원 여부로 바뀐다.
  const supported = useSyncExternalStore(
    noSubscribe,
    isWebSerialSupported,
    () => false,
  );
  const [status, setStatus] = useState<NiimbotStatus>({ kind: "idle" });
  const [profile, setProfile] = useState<PrinterProfile | null>(null);
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

  const connect = useCallback(async () => {
    setStatus({ kind: "connecting" });
    try {
      const conn = await connectNiimbot(() => {
        if (connRef.current !== null) {
          connRef.current = null;
          setProfile(null);
          setStatus({ kind: "idle", notice: "프린터 연결이 끊어졌습니다." });
        }
      });
      connRef.current = conn;
      setProfile(conn.profile);
      setStatus({
        kind: "connected",
        notice: conn.profile.recognized
          ? undefined
          : "모델을 알아보지 못해 M2_H 설정(300dpi)으로 출력합니다.",
      });
    } catch (error) {
      connRef.current = null;
      setProfile(null);
      setStatus({ kind: "error", message: describeNiimbotError(error) });
    }
  }, []);

  const disconnect = useCallback(async () => {
    const conn = connRef.current;
    connRef.current = null;
    setProfile(null);
    if (conn) await disconnectNiimbot(conn);
    setStatus({ kind: "idle" });
  }, []);

  const print = useCallback(
    async (jobs: JobsFactory) => {
      const conn = connRef.current;
      if (!conn) return;
      setStatus({ kind: "printing", page: 1, total: 0, percent: 0 });
      try {
        const list = await jobs(conn.profile);
        const total = list.reduce((n, j) => n + j.quantity, 0);
        if (total === 0) {
          setStatus({ kind: "connected" });
          return;
        }
        setStatus({ kind: "printing", page: 1, total, percent: 0 });
        await printJobs(conn, list, {
          density,
          onProgress: (p) =>
            setStatus({ kind: "printing", page: p.page, total: p.total, percent: p.percent }),
        });
        setStatus({ kind: "connected", notice: `라벨 ${total}장을 보냈습니다.` });
      } catch (error) {
        if (!conn.client.isConnected()) {
          connRef.current = null;
          setProfile(null);
        }
        setStatus({ kind: "error", message: describeNiimbotError(error) });
      }
    },
    [density],
  );

  return {
    supported,
    status,
    profile,
    busy: status.kind === "connecting" || status.kind === "printing",
    density,
    setDensity,
    connect,
    disconnect,
    print,
  };
}
