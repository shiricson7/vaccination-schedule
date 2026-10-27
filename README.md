# 예방접종 안내 라벨

접종 예정일을 추가하고 그날 이후에 맞을 백신을 고르면, 50 × 30 mm 라벨로
바로 출력할 수 있는 안내문이 만들어집니다. 한 날짜에 백신이 많으면 라벨이
자동으로 여러 장(1/2, 2/2 …)으로 나뉩니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 <http://localhost:3000> 을 엽니다.

| 명령              | 설명                       |
| ----------------- | -------------------------- |
| `npm run dev`     | 개발 서버 (Turbopack)      |
| `npm run build`   | 프로덕션 빌드              |
| `npm run start`   | 빌드 결과 실행             |
| `npm run lint`    | ESLint                     |
| `npm run typecheck` | TypeScript 타입 검사     |

## 즐겨찾기 세트와 백신 추가

- **즐겨찾기 세트**: 날짜에 백신을 고른 뒤 백신 패널 위의 "현재 선택을 세트로
  저장"을 누르고 이름을 붙입니다. 세트를 누르면 그 백신들이 한 번에 선택되고,
  모두 선택된 상태에서 다시 누르면 해제됩니다. × 로 세트를 지웁니다.
- **백신 추가**: 백신 목록 끝의 "백신 추가"로 목록에 없는 백신을 넣습니다.
  추가한 백신은 "직접 추가" 표시가 붙고 × 로 지울 수 있으며, 지우면 선택한
  날짜와 세트에서도 빠집니다.
- 둘 다 이 PC 브라우저의 localStorage에 저장됩니다
  (`vaccination-schedule.sets.v1`, `vaccination-schedule.custom-vaccines.v1`).
  다른 PC나 브라우저와는 공유되지 않습니다. 날짜·선택은 저장하지 않습니다.

## 라벨 출력 설정

인쇄 대화상자에서 아래처럼 맞춥니다. 라벨 1장이 페이지 1장입니다.

- 용지 크기: **50 × 30 mm** (프린터 드라이버 기본 용지도 같은 값으로)
- 여백: **없음**, 머리글/바닥글 **끄기**
- 배율: **100%** ("페이지에 맞춤" 사용 안 함)

라벨 규격을 바꾸려면 `app/globals.css`의 `@page` 크기와 `.label`의
`--label-w` / `--label-h`, 그리고 `app/lib/labels.ts`의 `LABEL` 값을 함께
수정합니다. 병원 이름과 백신 목록은 `app/lib/vaccines.ts`에 있습니다.

## 구조

```
app/
  layout.tsx              IBM Plex Sans KR / IBM Plex Mono 폰트, 메타데이터
  globals.css             디자인 토큰, 라벨 스타일, 인쇄(@page 50mm 30mm) 규칙
  page.tsx
  components/
    VaccinationApp.tsx    화면 전체: 헤더 + 3단(날짜 사이드바 · 백신 패널 · 프린터 트레이)
    DateSidebar.tsx       접종 예정일 추가 폼 + 날짜 타임라인
    StatTiles.tsx         날짜·백신·라벨 수 요약 타일
    VaccinePanel.tsx      선택한 날짜의 백신 고르기 + 백신 추가/삭제
    VaccineSets.tsx       즐겨찾기 세트 저장/적용/삭제
    LabelTray.tsx         라벨 미리보기 + 출력 버튼 + 프린터 설정 안내
    Label.tsx             라벨 1장 마크업 (미리보기·인쇄 공용)
    LabelPreview.tsx      실제 비율로 확대한 미리보기
    LabelMeasure.tsx      숨긴 라벨을 실제 폰트로 재서 페이지 분할에 쓰는 치수 측정
    PrintSheet.tsx        인쇄 전용 루트 (@media print에서만 표시)
  lib/
    vaccines.ts           병원 이름, 기본 백신 목록, 세트 타입
    storage.ts            localStorage 저장 훅 (세트, 추가한 백신)
    labels.ts             라벨 규격, 페이지 분할 로직
    date.ts               날짜 파싱/표기
    ui.ts                 버튼 공통 클래스
```

디자인 토큰(색·서체)은 `app/globals.css` 맨 위 `:root`에 모여 있습니다.

## 기술 스택

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript 6 ·
lucide-react · IBM Plex (next/font/google로 자체 호스팅)
