import type { CSSProperties } from "react";
import { formatLabelDate } from "../lib/date";
import type { LabelPage } from "../lib/labels";
import { CLINIC_NAME } from "../lib/vaccines";

type Props = {
  page: LabelPage;
  style?: CSSProperties;
};

/** 50×30mm 라벨 한 장. 미리보기와 인쇄가 같은 마크업을 쓴다. */
export function Label({ page, style }: Props) {
  return (
    <div className="label" style={style}>
      <div className="label-head">
        <span>{CLINIC_NAME} · 예방접종 안내</span>
        {page.total > 1 && (
          <span className="label-page">
            {page.index}/{page.total}
          </span>
        )}
      </div>
      <div className="label-date">{formatLabelDate(page.date)} 이후 접종</div>
      <div className="label-rule" />
      <ul className="label-body">
        {page.items.map((vaccine) => (
          <li key={vaccine} className="label-item">
            {vaccine}
          </li>
        ))}
      </ul>
    </div>
  );
}
