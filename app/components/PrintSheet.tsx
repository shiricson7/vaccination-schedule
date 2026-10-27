import type { LabelPage } from "../lib/labels";
import { Label } from "./Label";

/** 인쇄 전용 루트. 화면에서는 숨기고 @media print에서만 보인다. */
export function PrintSheet({ pages }: { pages: LabelPage[] }) {
  return (
    <div className="print-root hidden" aria-hidden="true">
      {pages.map((page) => (
        <Label key={page.key} page={page} />
      ))}
    </div>
  );
}
