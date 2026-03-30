# Virtual DOM Engine v2

이 저장소는 v1 Virtual DOM 학습용 데모에서 `공식 React 안정 공개 모듈 호환 프로젝트`로 전환되고 있습니다.
v2의 목표는 현재 공식 문서 기준의 안정 공개 API를 가능한 넓게 구현하는 것입니다.

## 활성 v2 문서

- [requirements.md](./docs/requirements.md)
- [architecture.md](./docs/architecture.md)
- [api-spec.md](./docs/api-spec.md)
- [parity-matrix.md](./docs/parity-matrix.md)
- [ssr-streaming-spec.md](./docs/ssr-streaming-spec.md)
- [test-strategy.md](./docs/test-strategy.md)

## 기준 버전

- `react@19.2`
- `react-dom@19.2`

기준선은 2026-03-30 시점 공식 React 문서의 안정 공개 API입니다.
Canary, Experimental, private API는 범위에 포함하지 않습니다.
`react-dom/hooks`, `react-dom/components`는 공식 문서의 분류 기준이며, 별도 import 엔트리포인트를 의미하지 않습니다.

## 지원 모듈 범위

v2는 다음 안정 공개 모듈 범위를 목표로 합니다.

- `react`
- `react-dom`
- `react-dom/client`
- `react-dom/server`
- `react-dom/static`
- `react-dom/hooks`
- `react-dom/components`

핵심 기능 범주는 다음과 같습니다.

- 함수형 컴포넌트
- 클래스 컴포넌트
- hooks
- context
- refs
- reconciliation
- synthetic events
- DOM rendering
- SSR
- hydration
- static prerender
- Suspense, `lazy`, `use`, transition, optimistic UI
- form action과 `useFormStatus`
- resource preload / preconnect API
- 테스트용 `act` flush semantics
- portals
- StrictMode
- Profiler
- error boundary

## 공개 API 맵

주요 공개 API 범주는 다음과 같습니다.

- `react`
  - `Children`, `Component`, `PureComponent`, `Fragment`, `Profiler`, `StrictMode`, `Suspense`, `Activity`
  - `act`, `captureOwnerStack`, `cloneElement`, `createContext`, `createElement`, `createRef`, `forwardRef`, `isValidElement`, `lazy`, `memo`, `startTransition`
  - `use`, `useActionState`, `useCallback`, `useContext`, `useDebugValue`, `useDeferredValue`, `useEffect`, `useEffectEvent`, `useId`, `useImperativeHandle`, `useInsertionEffect`, `useLayoutEffect`, `useMemo`, `useOptimistic`, `useReducer`, `useRef`, `useState`, `useSyncExternalStore`, `useTransition`
- `react-dom`
  - `createPortal`, `flushSync`, `preconnect`, `prefetchDNS`, `preinit`, `preinitModule`, `preload`, `preloadModule`, `useFormStatus`
- `react-dom/client`
  - `createRoot`, `hydrateRoot`
  - root option: `onCaughtError`, `onUncaughtError`, `onRecoverableError`, `identifierPrefix`
- `react-dom/server`
  - `renderToPipeableStream`, `renderToReadableStream`, `renderToStaticMarkup`, `renderToString`, `resume`, `resumeToPipeableStream`
- `react-dom/static`
  - `prerender`, `prerenderToNodeStream`

상세 계약은 [docs/api-spec.md](./docs/api-spec.md)를 따릅니다.

## 패키지 엔트리포인트

v2는 최소한 다음과 동등한 엔트리포인트를 목표로 합니다.

- 패키지 루트
- `package/jsx-runtime`
- `package/jsx-dev-runtime`
- `package/dom`
- `package/dom/client`
- `package/dom/server`
- `package/dom/static`

## 아키텍처 요약

활성 아키텍처는 다음 축으로 구성됩니다.

- `runtime-core`
  - element, component runtime, hooks, context, scheduler, reconciler, diagnostics
- `renderer-dom`
  - host mutation, synthetic events, form semantics, resources, hydration primitives, portal integration
- `renderer-dom-client`
  - `createRoot`, `hydrateRoot`, root option 처리
- `renderer-dom-server`
  - server string / stream rendering, resume
- `renderer-dom-static`
  - prerender, static output
- `sample-app`
  - 공개 API만 사용해 런타임을 검증하는 실제 앱

자세한 구조는 [docs/architecture.md](./docs/architecture.md)를 따릅니다.

## 제외 또는 완화 범위

다음은 v2의 명시적 비범위 또는 완화 범위입니다.

- React Server Components 전체
- Server Functions 전체
- React Native renderer 호환
- React DevTools 프로토콜 호환
- React Compiler 관련 기능
- eslint-plugin-react-hooks 구현
- private internals
- `unstable_batchedUpdates`
- Canary / Experimental API
- `react-dom/static`의 `resumeAndPrerender`, `resumeAndPrerenderToNodeStream`
- `react`의 `cache`, `cacheSignal`
- `captureOwnerStack` 문자열의 byte-for-byte 동일성
- warning 문자열의 byte-for-byte 동일성
- Profiler 수치의 완전 동일성
- 모든 브라우저별 IME, caret, selection 미세 차이
- 모든 희귀 synthetic event 매핑의 완전 동일성

이 제외 범위는 안정 공개 API의 의미적 호환성을 포기한다는 뜻이 아닙니다.
완화된 항목도 가능한 한 React와 가깝게 구현해야 합니다.

## Parity 테스트 전략

검증의 중심은 React와 직접 비교하는 parity 테스트입니다.

최소 비교 항목:

- DOM 결과
- update 결과
- lifecycle 로그
- effect 로그
- ref 로그
- event 로그
- hydration 결과
- SSR 결과
- static prerender 결과
- Suspense 전환
- state 보존 동작
- Profiler `onRender` 로그
- StrictMode 개발 모드 로그
- synthetic event object 동작
- form control 동작
- root option 동작
- batching boundary 동작
- `act` flush 결과
- warning 및 recoverable error 분류

## 샘플 앱 방향

v1의 데모 페이지 대신 별도 샘플 앱으로 v2를 검증합니다.
샘플 앱은 최소한 다음을 포함해야 합니다.

- 중첩 컴포넌트 조합
- 리스트 삽입, 삭제, 필터링, 재정렬
- controlled form
- 클래스 컴포넌트와 함수형 컴포넌트의 혼합 사용
- context와 refs
- portals
- error boundary 흐름
- Suspense 기반 비동기 로딩
- transition
- deferred update
- optimistic update
- action 기반 form 흐름
- hydration 검증 시나리오
- SSR 또는 prerender 기반 초기 HTML 생성 시나리오
- Profiler를 통한 렌더 계측 경로
- `Children`, `memo`, `forwardRef`, `createContext`, `use`, `useActionState`, `useFormStatus` 사용 사례
- `Activity`, `captureOwnerStack` 사용 사례
- `act` 기반 테스트 사용 사례
- resource preloading API 사용 사례

## SSR / Hydration / Prerender 전략

Hydration은 예외 기능이 아니라 v2의 1급 요구사항입니다.
서버 렌더 HTML, prerender HTML, postponed state, `identifierPrefix`, `useId`, recoverable error reporting이 모두 같은 시스템 안에서 연결되어야 합니다.

최소 검증 범위:

- `renderToString`, `renderToStaticMarkup`
- `renderToReadableStream`, `renderToPipeableStream`
- `resume`, `resumeToPipeableStream`
- `prerender`, `prerenderToNodeStream`
- `hydrateRoot`
- `suppressHydrationWarning`
- `onCaughtError`, `onUncaughtError`, `onRecoverableError`

추가로 다음 세부 순서를 검증합니다.

- bootstrap asset 출력 순서
- abort 이후 error / fallback / output surface
- postponed state와 resume 연결 수명주기
- web stream / node stream 환경 차이
- `renderToReadableStream().allReady`
- `renderToPipeableStream().pipe()` / `abort()` 및 shell/all-ready callback

## 이벤트 및 batching 검증 범위

이벤트 시스템은 delegated synthetic event 구조를 유지해야 합니다.
최소 검증 이벤트군은 다음과 같습니다.

- `click`
- `input`
- `change`
- `beforeinput`
- composition events
- `focus` / `blur`
- keyboard / pointer / mouse events
- `scroll`
- `wheel`
- `submit`
- `reset`
- `select`

자동 batching은 다음 경계에서 React와 호환되어야 합니다.

- React synthetic event
- native DOM event
- promise / microtask
- `setTimeout`
- `flushSync`

`act`는 테스트 환경에서 다음을 보장해야 합니다.

- async `act`를 기본 경로로 사용
- sync `act`는 호환 레이어로 검증
- scope 안의 render / commit / passive effect / microtask 후속 update flush
- 종료 시점의 안정 DOM / ref / effect 상태
- `IS_REACT_ACT_ENVIRONMENT`와 동등한 테스트 환경 전제

## 경고, 오류, Profiler 기준

개발 모드에서는 StrictMode, warning surface, root error option을 검증합니다.
문구 자체의 byte 단위 동일성은 요구하지 않지만, 의미, 종류, 발생 시점은 맞아야 합니다.

Profiler는 다음을 검증합니다.

- `id`
- `onRender`
- `phase`
- `actualDuration`
- `baseDuration`
- `startTime`
- `commitTime`

수치는 완전 동일성이 아니라 React 수준의 근접도를 목표로 합니다.

`Activity`, `captureOwnerStack`, `useActionState`, `useFormStatus`도 추가로 구체 검증합니다.

- `Activity`
  - hidden 전환 시 ref/effect 정리 순서
  - visible 복귀 시 state 보존과 effect 복구
- `captureOwnerStack`
  - 개발 모드 가용성
  - production 비활성화 또는 `null` 반환 semantics
- `useActionState`, `useFormStatus`
  - 가장 가까운 form 경계
  - 동시 submit / 연속 submit 시 pending, success, error, reset 순서

`use`는 일반 hook과 달리 조건문/반복문에서 허용되지만 `try/catch` 안에서는 허용되지 않는 예외 규칙까지 검증합니다.

## 현재 상태

- 저장소는 v2 런타임과 샘플 앱 구현을 향해 전환 중입니다.
- 기존 v1 core 구현 파일은 v2 대체 구현이 준비될 때까지 임시로 남아 있습니다.
- 문서는 이제 React 19.2 안정 공개 모듈 기준으로 정리됩니다.

## 아카이브

v1 데모 자산과 기존 문서는 아래로 이동했습니다.

- [archive/v1](./archive/v1)
