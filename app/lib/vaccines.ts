export const CLINIC_NAME = "신익순 소아과";

/** 기본 백신 목록. 사용자가 추가한 백신은 이 뒤에 붙고, 이 순서가 라벨에 인쇄되는 순서다. */
export const DEFAULT_VACCINES = [
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

/** 즐겨찾기 세트: 자주 함께 맞는 백신 묶음 */
export type VaccineSet = { id: string; name: string; vaccines: string[] };

/** 선택 순서와 무관하게 항상 목록(기본 + 추가) 순서로 정렬한다. */
export function sortVaccines(
  list: readonly string[],
  order: readonly string[],
): string[] {
  const index = new Map<string, number>(order.map((v, i) => [v, i]));
  return [...list].sort(
    (a, b) => (index.get(a) ?? Infinity) - (index.get(b) ?? Infinity),
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

/** 입력한 이름 정리: 앞뒤 공백 제거, 연속 공백은 하나로 */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** 세트 id. http(비보안) 환경에서는 crypto.randomUUID가 없어 대체값을 쓴다. */
export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* 아래 대체값 사용 */
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
