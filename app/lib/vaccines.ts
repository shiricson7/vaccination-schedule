export const CLINIC_NAME = "신익순 소아과";

/** 선택 목록에 쓰는 백신. 이 순서가 라벨에 인쇄되는 순서다. */
export const VACCINES = [
  "BCG(피내용)",
  "B형간염",
  "DTaP(디프테리아/파상풍/백일해)",
  "IPV(폴리오)",
  "PCV(폐렴구균)",
  "MMR(홍역/유행성이하선염/풍진)",
  "수두",
  "일본뇌염(사백신)",
  "일본뇌염(생백신)",
  "A형간염",
  "Hib(b형헤모필루스인플루엔자)",
  "Td(파상풍/디프테리아)",
  "Tdap(파상풍/디프테리아/백일해)",
  "HPV(인유두종바이러스)",
  "인플루엔자",
  "로타장염",
  "수막구균(멘비오)",
  "수막구균(백세로)",
] as const;

export type Vaccine = (typeof VACCINES)[number];

const ORDER = new Map<string, number>(VACCINES.map((v, i) => [v, i]));

/** 클릭한 순서와 무관하게 항상 목록 순서로 정렬한다. */
export function sortVaccines(list: readonly string[]): string[] {
  return [...list].sort(
    (a, b) => (ORDER.get(a) ?? Infinity) - (ORDER.get(b) ?? Infinity),
  );
}

/** "DTaP(디프테리아/파상풍/백일해)" → { main: "DTaP", detail: "디프테리아/파상풍/백일해" } */
export function splitVaccineName(name: string): {
  main: string;
  detail: string | null;
} {
  const m = /^(.*?)\((.*)\)$/.exec(name);
  return m ? { main: m[1], detail: m[2] } : { main: name, detail: null };
}
