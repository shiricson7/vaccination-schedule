import { cx } from "./cx";

/** 버튼 공통 클래스 */
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = cx(
  btn,
  "h-10 bg-accent px-4 text-accent-fg hover:bg-accent-strong disabled:hover:bg-accent",
);

export const btnGhost = cx(
  btn,
  "h-10 px-3 text-ink-muted hover:bg-surface-2 hover:text-ink",
);
