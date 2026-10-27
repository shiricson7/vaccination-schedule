import { cx } from "../lib/cx";

type Props = { dates: number; vaccines: number; labels: number };

/** 메인 상단 요약 타일 */
export function StatTiles({ dates, vaccines, labels }: Props) {
  const tiles = [
    { label: "접종 예정일", value: dates, unit: "", tint: "bg-accent-soft" },
    { label: "선택한 백신", value: vaccines, unit: "개", tint: "bg-mint" },
    { label: "라벨", value: labels, unit: "장", tint: "bg-butter" },
  ];

  return (
    <dl className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cx("rounded-2xl border border-line/60 px-4 py-3", t.tint)}
        >
          <dt className="eyebrow">{t.label}</dt>
          <dd className="mt-1 font-mono text-2xl font-medium tabular-nums sm:text-3xl">
            {t.value}
            {t.unit && (
              <span className="ml-1 text-sm font-normal text-ink-muted">
                {t.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
