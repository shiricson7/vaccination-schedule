# 예방접종 안내 라벨

NIIMBOT 라벨 프린터(M2_H)로 50 × 30 mm 라벨을 바로 출력하는 신익순 소아과용 도구입니다.

- **접종 안내**: 접종 예정일을 추가하고 그날 이후에 맞을 백신을 고르면 안내 라벨이
  만들어집니다. 한 날짜에 백신이 많으면 라벨이 자동으로 여러 장(1/2, 2/2 …)으로 나뉩니다.
- **텍스트 라벨**: 날짜 없이 원하는 문구를 라벨 한 장에 출력합니다. 글자 크기는 라벨에
  맞춰 자동으로 정해지고, 정렬(왼쪽/가운데)과 장수를 고를 수 있습니다.
- 출력은 USB로 연결한 NIIMBOT에 브라우저에서 직접 보냅니다. Windows 프린터 드라이버나
  인쇄 대화상자는 쓰지 않습니다.

## 실행

```bash
npm install
npm run dev
```

**Chrome 또는 Edge**에서 <http://localhost:3000> 을 엽니다 (Web Serial API가 필요합니다.
`localhost`가 아니면 https 여야 합니다).

| 명령                | 설명                   |
| ------------------- | ---------------------- |
| `npm run dev`       | 개발 서버 (Turbopack)  |
| `npm run build`     | 프로덕션 빌드          |
| `npm run start`     | 빌드 결과 실행         |
| `npm run lint`      | ESLint                 |
| `npm run typecheck` | TypeScript 타입 검사   |

## NIIMBOT 출력

1. 프린터를 켜고 USB를 꽂습니다. NIIMBOT PC 앱이 같은 포트를 쓰고 있으면 닫습니다.
2. 헤더(또는 프린터 트레이)의 **NIIMBOT 연결**을 누르고 목록에서 `USB 직렬 장치 (COMx)`를
   고릅니다. 연결되면 "M2_H · 300dpi · 연결됨"이 표시됩니다.
3. **NIIMBOT로 N장 출력**을 누릅니다. 진행률이 표시되고, 진하기(1–5)는 트레이에서 바꿀 수
   있습니다(이 브라우저에 저장).

- 프린터가 꺼져 있으면 USB로는 잡혀도 연결 패킷에 응답하지 않습니다.
- Claude 앱 등 임베디드 브라우저에서는 포트 선택 창이 열리지 않습니다. Chrome/Edge에서
  직접 여세요.
- 정품 NIIMBOT 라벨(RFID)이 아니면 프린터가 거부할 수 있습니다.
- M2_H 기준 300dpi, 인쇄폭 48mm, 위쪽 급지. 다른 모델은 라이브러리의 모델 정보를 따르고,
  못 알아보면 M2_H 값으로 출력합니다.
- 프로토콜은 오픈소스 [`@mmote/niimbluelib`](https://www.npmjs.com/package/@mmote/niimbluelib)
  (NIIMBOT 비공식 구현)을 쓰며, 버튼을 눌렀을 때만 내려받습니다.

## 즐겨찾기 세트, 백신 추가, 자주 쓰는 문구

- **즐겨찾기 세트**: 날짜에 백신을 고른 뒤 백신 패널 위의 "현재 선택을 세트로 저장"을
  누르고 이름을 붙입니다. 세트를 누르면 그 백신들이 한 번에 선택되고, 모두 선택된
  상태에서 다시 누르면 해제됩니다.
- **백신 추가**: 백신 목록 끝의 "백신 추가"로 목록에 없는 백신을 넣습니다. "직접 추가"
  표시가 붙고 × 로 지울 수 있으며, 지우면 선택한 날짜와 세트에서도 빠집니다.
- **자주 쓰는 문구**: 텍스트 라벨 모드에서 문구를 입력한 뒤 왼쪽의 "현재 문구 저장"을
  누릅니다. 저장한 문구를 누르면 편집창에 불러와 바로 출력할 수 있습니다.
- 모두 이 PC 브라우저의 localStorage에 저장됩니다 (`vaccination-schedule.*` 키). 다른 PC나
  브라우저와는 공유되지 않습니다. 날짜·선택·입력 중인 문구는 저장하지 않습니다.

## 라벨 규격 바꾸기

라벨 규격은 `app/lib/labels.ts`의 `LABEL`(mm)과 `app/globals.css`의 `.label`
(`--label-w` / `--label-h`)에 있습니다. 병원 이름과 기본 백신 목록은
`app/lib/vaccines.ts`에 있습니다. 프린터로 보내는 비트맵은 `app/lib/labelCanvas.ts`가
같은 mm/pt 규칙으로 그립니다.

## 구조

```
app/
  layout.tsx              IBM Plex Sans KR / IBM Plex Mono 폰트, 메타데이터
  globals.css             디자인 토큰, 라벨 스타일
  page.tsx
  hooks/
    useNiimbot.ts         앱 전체가 공유하는 프린터 연결·출력 상태
    useTextLabelRender.ts 텍스트 라벨 미리보기 비트맵
  components/
    VaccinationApp.tsx    화면 전체: 헤더(모드 전환, 출력) + 3단(사이드바 · 패널 · 트레이)
    DateSidebar.tsx       접종 예정일 추가 폼 + 날짜 타임라인
    StatTiles.tsx         날짜·백신·라벨 수 요약 타일
    VaccinePanel.tsx      선택한 날짜의 백신 고르기 + 백신 추가/삭제
    VaccineSets.tsx       즐겨찾기 세트 저장/적용/삭제
    TextEditor.tsx        텍스트 라벨 문구·정렬·장수
    TextTemplates.tsx     자주 쓰는 문구 저장/불러오기/삭제
    TextLabelPreview.tsx  텍스트 라벨 미리보기
    LabelTray.tsx         미리보기 + NIIMBOT 패널
    NiimbotPanel.tsx      연결 상태, 진하기, 진행률, 오류
    LabelPreview.tsx      접종 안내 라벨 미리보기 (실제 비율)
    Label.tsx             접종 안내 라벨 1장 마크업
    LabelMeasure.tsx      숨긴 라벨을 실제 폰트로 재서 페이지 분할에 쓰는 치수 측정
  lib/
    vaccines.ts           병원 이름, 기본 백신 목록, 세트 타입
    text.ts               자주 쓰는 문구 타입
    storage.ts            localStorage 저장 훅
    labels.ts             라벨 규격, 페이지 분할 로직
    labelCanvas.ts        라벨 → 프린터 비트맵 (접종 안내, 텍스트)
    niimbot.ts            NIIMBOT 연결·출력 (Web Serial, niimbluelib)
    date.ts               날짜 파싱/표기
    ui.ts                 버튼 공통 클래스
```

디자인 토큰(색·서체)은 `app/globals.css` 맨 위 `:root`에 모여 있습니다.

## 기술 스택

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript 6 ·
lucide-react · IBM Plex (next/font/google로 자체 호스팅) · @mmote/niimbluelib
