import type { TextAlign } from "./labelCanvas";

/** 자주 쓰는 문구 (텍스트 라벨 템플릿) */
export type TextTemplate = {
  id: string;
  name: string;
  text: string;
  align: TextAlign;
};

/** 문구의 첫 줄 */
export function firstLine(text: string): string {
  return text.replace(/\r\n?/g, "\n").split("\n").find((l) => l.trim() !== "")?.trim() ?? "";
}

/** 저장할 때 제안하는 이름: 첫 줄을 20자까지 */
export function suggestTemplateName(text: string): string {
  const line = firstLine(text);
  return line.length > 20 ? `${line.slice(0, 20)}…` : line;
}
