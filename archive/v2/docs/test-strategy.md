# 테스트 전략 v2

## 1. 문서 목적

본 문서는 v2의 parity 테스트, 통합 테스트, 환경 매트릭스, 허용 오차 정책을 정의한다.
세부 API 범위는 `api-spec.md`, 구현 범위는 `requirements.md`, 구조 책임은 `architecture.md`를 따른다.

## 2. 테스트 계층

### 2.1 단위 테스트

- element shape
- hook queue
- reconciler
- scheduler
- diagnostics
- resource API dedupe

### 2.2 parity 테스트

동일 입력을 React와 현재 구현에 각각 실행해 다음을 비교한다.

- DOM 결과
- lifecycle / effect / ref / event 로그
- warning / error 분류
- hydration 결과
- SSR / static 결과
- batching 경계
- `act` flush 결과

### 2.3 통합 테스트

- 샘플 앱
- form action 흐름
- Suspense + transition + optimistic UI
- Activity visibility
- resource preload + hydration

## 3. 환경 매트릭스

다음 환경 조합을 명시적으로 관리한다.

| 축 | 값 |
| --- | --- |
| build mode | development / production |
| runtime | browser / node |
| stream | web stream / node stream |
| render path | client / SSR / hydrate / static prerender / resume |
| act env | `IS_REACT_ACT_ENVIRONMENT` on / off |

## 4. `act` 테스트 정책

- 기본 경로는 `await act(async () => {})`다.
- sync `act(() => {})`는 호환 레이어로 별도 검증한다.
- act scope 안의 render, commit, passive effect, microtask 후속 update까지 drain되는지 확인한다.
- act 미사용 상황에서는 React 호환 warning surface를 비교한다.

## 5. warning / error 비교 정책

다음 항목은 완전 문자열 일치보다 의미 비교를 우선한다.

- warning 문구
- `captureOwnerStack` 문자열
- recoverable error message 본문

반드시 같은 것으로 보는 기준:

- 오류 분류
- 발생 시점
- 관련 component stack / owner stack 존재 여부
- root option callback 호출 여부

## 6. Profiler 비교 정책

다음은 정확히 비교한다.

- `id`
- `phase`
- 호출 횟수
- start/commit의 상대 순서

다음은 허용 오차 기반 비교를 사용한다.

- `actualDuration`
- `baseDuration`
- `startTime`
- `commitTime`

허용 오차는 테스트 환경별 baseline 문서로 고정해야 하며, 임의로 늘리면 안 된다.

## 7. `use` 테스트 정책

- Promise read
- Context read
- 조건문 내부 호출 허용
- 반복문 내부 호출 허용
- `try/catch` 내부 호출 금지
- Error Boundary 또는 Promise `catch` 대체 경로

## 8. form action / status 테스트 정책

- 단일 form submit
- 동시 submit
- 연속 submit
- success / error / reset 순서
- nearest parent form 경계
- same-component local form 오해 방지
- `useFormStatus`의 nullable field
- `useActionState`의 `permalink`

## 9. SSR / streaming 테스트 정책

- `renderToString`
- `renderToStaticMarkup`
- `renderToReadableStream().allReady`
- `renderToPipeableStream().pipe()` / `abort()`
- `onShellReady`, `onAllReady`, `onShellError`, `onError`
- `resume`
- `resumeToPipeableStream`
- `prerender`
- `prerenderToNodeStream`
- postponed state lifecycle
- bootstrap asset order

세부 순서 비교는 `ssr-streaming-spec.md`를 따른다.

## 10. 문서 연결

- 범위와 승인 기준: `requirements.md`
- 계층 책임: `architecture.md`
- 공개 API shape: `api-spec.md`
- API 상태 표: `parity-matrix.md`
- SSR / streaming 상세: `ssr-streaming-spec.md`
