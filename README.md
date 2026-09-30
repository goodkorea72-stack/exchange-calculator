# 환율 계산기 · Exchange Calculator

입력하는 즉시 원화 ↔ 세계 통화를 **양방향**으로 변환하는 웹 앱입니다.
React 18 + TypeScript + Vite 로 만들었고, 환율 조회에 실패해도 **마지막으로 성공한
환율로 계산이 계속됩니다.**

---

## 기능

| | |
|---|---|
| **양방향 즉시 변환** | 금액을 입력하는 순간 반대편 통화 결과가 갱신됩니다. 엔터/버튼 없음. |
| **2중 환율 소스** | `exchangerate-api` (키 필요) → 실패 시 `Frankfurter`(ECB 기준, 키 불필요) 자동 폴백 |
| **오프라인 복원** | 마지막 성공 환율을 `localStorage` 에 캐시. 네트워크가 끊겨도 계산 유지 |
| **5분 자동 갱신** | 주기 갱신 + 탭 재활성화 + 네트워크 복귀 시 자동 갱신 |
| **38개 통화** | KRW·USD·EUR·JPY … 통화별 최소 단위 자릿수(0/2/3) 준수 |
| **크로스 환율** | 모든 통화를 USD 기준으로 한 번에 받아 중간 통화 경유 계산 |
| **경량** | 프로덕션 번들 gzip **52 KB**, 런타임 의존성 React 뿐 |
| **접근성** | `useId` 기반 라벨 연결, 키보드 조작, `prefers-reduced-motion` 대응 |
| **자동 배포** | `main` 푸시 → GitHub Actions → GitHub Pages |

---

## 빠른 시작

```bash
npm install
npm run dev      # http://localhost:5173
```

### exchangerate-api 키 설정 (선택)

키가 없어도 **Frankfurter(ECB 기준) 환율로 정상 동작**합니다.
더 정확한 실시간 환율이 필요하면 키를 넣으세요.

```bash
cp .env.example .env
# VITE_EXCHANGERATE_API_KEY=여기에_키_입력
```

또는 앱 우측 상단 **API 설정** 버튼으로 입력할 수 있습니다
(브라우저 `localStorage` 에만 저장되며, exchangerate-api 요청 시에만 사용됩니다).

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 타입체크 + 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 로컬 확인 |
| `npm run typecheck` | `tsc --noEmit` (strict + `noUncheckedIndexedAccess`) |
| `npm test` | Vitest 단위/통합 테스트 (72건) |
| `npm run test:watch` | 테스트 워치 모드 |

---

## 아키텍처

의존성이 한 방향으로만 흐르는 3층 구조입니다.

```
src/
├── domain/          순수 함수 — 네트워크·DOM·저장소 의존 없음
│   ├── amount.ts        금액 파싱 · 통화/환율 표기
│   ├── convert.ts       환율 계산 (크로스 환율)
│   ├── currencies.ts    통화 메타데이터 (38종)
│   ├── pair.ts          방향 보정 · 스왑
│   └── time.ts          상대 시간 · 시각 표기
│
├── data/            I/O 경계 — 네트워크 + localStorage
│   ├── normalize.ts     API 응답 → 환율표 정규화
│   ├── rates.ts         소스 폴백 · 캐시 · TTL
│   └── storage.ts       사용자 설정 영속화
│
├── hooks/
│   └── useExchangeRates.ts  로딩 상태 · 자동 갱신 · 요청 취소
│
└── components/      표현 계층 (순수 props)
```

### 설계 원칙

**1. 순수 함수를 먼저 쓴다.**
계산·표기 로직에 `Date.now()`, `fetch()`, `localStorage`가 들어가지 않습니다.
`formatRelativeTime(timestamp, now)` 처럼 현재 시각을 **인자로 받습니다.**
덕분에 `environment: 'node'` 에서도 72건 테스트가 돌고, DOM 없이 결정적으로 검증됩니다.

**2. 실패해도 죽지 않는다.**
환율 조회는 3단 폴백을 탑니다.

```
exchangerate-api (키 있을 때)
  └─ 실패 → Frankfurter (ECB, 키 불필요)
       └─ 실패 → localStorage 캐시  ← 계산 계속, 배너로만 알림
```

**3. 방어적으로 정규화한다.**
외부 응답은 절대 신뢰하지 않습니다. `normalize.ts` 는 `result`/`base_code` 일치 여부,
3자 알파벳 코드, 양의 유한값만 통과시킵니다. 저장된 설정도 같은 방식으로 검증합니다
(`sanitizeSettings`). 앱이 새 통화를 만나도 깨지지 않습니다.

**4. 늦은 응답은 버린다.**
`useExchangeRates` 는 요청마다 시퀀스 번호를 붙이고 `AbortController` 로 취소합니다.
더 최신 요청이 이미 처리됐다면 이전 응답은 무시 — 순서가 뒤바뀌어도 화면이 어긋나지 않습니다.

---

## 환율 계산이 올바른 이유

모든 환율을 **USD 기준**으로 한 번에 받아 크로스 환율을 계산합니다.

```
amount / rates[from]  →  USD 단위
× rates[to]           →  목표 통화 단위
```

`src/data/pipeline.test.ts` 가 이 계약을 **실제 API 응답 샘플**로 검증합니다.
API 응답이 바뀌어 모듈 간 계약이 깨지면 *계산 결과보다 먼저* 테스트가 붉어집니다.

```ts
// 2026-09-30 실제 Frankfurter 응답에서 발췌한 상태 샘플
const FRANKFURTER_SAMPLE = {
  base: 'USD',
  rates: { KRW: 1353.36, EUR: 0.88067, JPY: 157.12 },
};

// 100 USD → KRW = 135,336
const result = convert(100, 'USD', 'KRW', rates);
expect(formatCurrency(result.value, 'KRW')).toBe('₩135,336');
```

여기에 **왕복 불변식**(`역변환하면 원래 값`), **표시 환율과 계산 결과 일치**,
**EUR 경유 크로스 환율** 검증을 더했습니다.

---

## 테스트

```
Test Files  6 passed (6)
     Tests  72 passed (72)
```

| 파일 | 커버 |
|---|---|
| `domain/convert.test.ts` (15) | 크로스 환율, 왕복, 0·음수·NaN·오버플로 |
| `domain/amount.test.ts` (23) | 콤마 파싱, 통화별 자릿수, 환율 반올림 규칙 |
| `data/normalize.test.ts` (12) | 두 API 응답 형식, base 불일치, 쓰레기 값 필터 |
| `data/storage.test.ts` (9) | 손상된 설정 방어, 방향 보정 |
| `domain/time.test.ts` (8) | 상대 시간, 미래 시각 방어 |
| `data/pipeline.test.ts` (5) | 실제 응답 샘플 기반 통합 검증 |

---

## 배포

`.github/workflows/deploy.yml` 이 `main` 푸시마다 자동 실행됩니다.

```
typecheck → test → build → upload-pages-artifact → deploy-pages
```

`vite.config.ts` 의 `base: './'` 가 GitHub Pages 서브경로
(`https://<user>.github.io/<repo>/`) 배포에 맞게 상대 경로를 만듭니다.

저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 지정하면 됩니다.

---

## 기술 스택

- **React 18.3** + **TypeScript 5.6** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Vite 5.4** (빌드)
- **Vitest 2.1** (테스트)
- **외부 런타임 의존성 없음** — 상태 관리·라우팅·스타일 라이브러리를 쓰지 않습니다

---

## 환율 데이터 출처

| 소스 | 기준 | 키 |
|---|---|---|
| [exchangerate-api](https://www.exchangerate-api.com) | 실시간 | 필요 |
| [Frankfurter](https://www.frankfurter.app) | ECB 참조 환율 | 불필요 |

ECB 참조 환율은 주요 통화만 지원하므로, Frankfurter 폴백 상태에서는 일부 통화가
`—`로 표시될 수 있습니다. 이는 소스 제약이며 오류가 아닙니다.

> ⚠️ 표시 환율은 **참고용**입니다. 실제 거래 시세는 은행·환전소의 적용 환율과 다릅니다.

---

## 라이선스

MIT
