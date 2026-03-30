# React 안정 공개 모듈 호환 요구사항 정의서 v2

## 1. 문서 목적

본 문서는 버전 2 시스템이 구현해야 하는 React 호환 범위, 검증 기준, 제외 범위를 정의한다.
버전 2는 더 이상 Virtual DOM 학습용 데모가 아니며, 공식 React 문서의 안정 공개 모듈을 최대한 폭넓게 구현하는 것을 목표로 한다.

본 문서는 다음을 정의한다.

- 어떤 모듈과 공개 API를 구현해야 하는가
- 어느 수준까지 React와 호환되어야 하는가
- 어떤 항목은 명시적으로 제외하거나 완화하는가
- 어떤 테스트와 산출물로 이를 입증해야 하는가

구조 설계는 `architecture.md`에서 정의한다.
공개 API 계약은 `api-spec.md`에서 정의한다.

## 2. 문서 권한

문서 우선순위는 다음과 같다.

1. `architecture.md`
2. `api-spec.md`
3. `requirements.md`
4. `README.md`

상위 문서와 하위 문서가 충돌하면 구현을 진행하지 않고 충돌을 먼저 해소해야 한다.

## 3. 기준 버전과 문서 기준선

버전 2의 기준선은 2026-03-30 시점 공식 React 문서의 안정 공개 API다.
현재 기준 목표 버전은 다음과 같다.

- `react@19.2`
- `react-dom@19.2`

참고한 공식 문서 범주는 다음과 같다.

- `react`
- `react-dom`
- `react-dom/client`
- `react-dom/server`
- `react-dom/static`
- `react-dom/hooks`
- `react-dom/components`

안정 채널의 공식 문서에 등재된 공개 API는, 본 문서에서 명시적으로 제외하지 않는 한 지원 범위에 포함된 것으로 본다.
Canary, Experimental, private, undocumented API는 범위에 포함하지 않는다.
`react-dom/hooks`, `react-dom/components`는 문서 분류 기준이며, 별도 import 가능한 독립 엔트리포인트를 의미하지 않는다.

## 4. 목표 정의

프로젝트는 다음 목표를 동시에 만족해야 한다.

1. 공식 React 문서의 안정 공개 모듈 대부분을 현재 프로젝트 안에서 구현 가능한 수준으로 제공한다.
2. 선언된 지원 범위 안에서 React와의 관찰 가능한 동작 차이를 0에 가깝게 줄인다.
3. 브라우저 클라이언트 렌더링뿐 아니라 SSR, hydration, 정적 prerender 흐름까지 수용한다.
4. 샘플 앱과 parity 테스트를 통해 실제 사용 가능성을 입증한다.
5. 유지보수 가능한 모듈 경계를 유지하면서 기능 범위를 확장할 수 있어야 한다.

성공 기준은 내부 구조가 React와 닮았는지가 아니다.
성공 기준은 공개 API, 반환값, 렌더 결과, 업데이트 결과, hydration 결과, 경고 표면, 오류 표면, 서버 렌더 결과가 React와 호환되는가이다.

## 5. 지원 범위

### 5.1 포함 범위

다음 모듈과 기능은 v2 필수 범위에 포함된다.

- `react`
- `react-dom`
- `react-dom/client`
- `react-dom/server`
- `react-dom/static`
- `react-dom/hooks` 문서 범주에 속한 안정 공개 API
- `react-dom/components` 문서 범주에 속한 안정 공개 API
- 함수형 컴포넌트
- 클래스 컴포넌트
- hooks
- context
- refs
- reconciliation과 state 보존 규칙
- synthetic event system
- DOM 렌더링과 DOM 업데이트
- form action 및 form status 흐름
- Suspense, lazy, `use`, transition, optimistic UI
- portals
- StrictMode
- Profiler
- error boundary
- SSR
- hydration
- 정적 prerender
- 지원 범위에 필요한 개발 모드 경고와 오류 표면

### 5.2 비범위 또는 완화 범위

다음 항목은 v2 필수 범위에 포함하지 않거나, React와의 완전 동일성 요구를 완화한다.

- React Server Components 전체
- Server Functions 전체
- React Native renderer 호환
- React DevTools 프로토콜 호환
- React Compiler 설정, directive, 산출물 호환
- eslint-plugin-react-hooks 구현
- 문서화되지 않은 private internals
- `unstable_batchedUpdates`
- Canary 또는 Experimental 채널 전용 API
- `react-dom/static`의 Experimental API
  - `resumeAndPrerender`
  - `resumeAndPrerenderToNodeStream`
- `react`의 Server Components 전용 API
  - `cache`
  - `cacheSignal`
- 개발자 진단용 owner stack 문자열의 완전 동일 출력
  - `captureOwnerStack` API 자체는 지원하되, 반환 문자열의 byte 단위 동일성은 요구하지 않는다.
- 경고 문구의 byte-for-byte 동일성
  - 의미, 종류, 발생 시점, 오류 분류가 일치하면 된다.
- Profiler 수치의 완전 동일성
  - phase 구분과 시점 관계는 같아야 하며, 수치는 합리적인 허용 오차 내 근접도를 요구한다.
- IME, caret, selection의 모든 브라우저별 미세 차이
  - 일반적인 입력 흐름과 주요 controlled semantics는 지원하되, 브라우저별 극단적인 미세 차이의 완전 일치는 요구하지 않는다.
- 모든 희귀 synthetic event 매핑의 완전 동일성
  - 주요 이벤트군과 일반 애플리케이션에서 기대하는 semantics를 우선 지원한다.

위 항목 외의 안정 공개 API는 원칙적으로 지원 범위에 포함된다.

## 6. 필수 호환 기준

지원 범위 안에서 시스템은 다음 항목에서 React와 호환되어야 한다.

- 공개 API 이름과 호출 형태
- module entry point 구성
- element 생성 규칙
- JSX runtime 동작
- 렌더 결과
- reconciliation 규칙
- state 보존 및 reset 규칙
- update queue 동작
- effect 스케줄링과 cleanup 시점
- context 전파
- ref 연결 및 해제 시점
- 클래스 라이프사이클 동작
- error boundary 동작
- Suspense fallback과 recovery 동작
- portal 동작
- synthetic event 동작
- DOM host mutation 결과
- SSR 출력 결과
- hydration 결과
- root option 동작
- recoverable error 처리
- 경고와 오류 표면
- batching 경계와 flush semantics
- Profiler 콜백 계약

지원 범위 안에서 관찰 가능한 불일치는 모두 버그로 간주한다.
단, 5.2에서 완화로 명시한 항목은 해당 완화 기준을 적용한다.

## 7. 필수 공개 API 범위

### 7.1 `react`

다음 안정 공개 API를 지원해야 한다.

- `Children`
- `Component`
- `Fragment`
- `Profiler`
- `PureComponent`
- `StrictMode`
- `Suspense`
- `Activity`
- `act`
- `captureOwnerStack`
- `cloneElement`
- `createContext`
- `createElement`
- `createRef`
- `forwardRef`
- `isValidElement`
- `lazy`
- `memo`
- `startTransition`
- `use`
- `useActionState`
- `useCallback`
- `useContext`
- `useDebugValue`
- `useDeferredValue`
- `useEffect`
- `useEffectEvent`
- `useId`
- `useImperativeHandle`
- `useInsertionEffect`
- `useLayoutEffect`
- `useMemo`
- `useOptimistic`
- `useReducer`
- `useRef`
- `useState`
- `useSyncExternalStore`
- `useTransition`
- version metadata

### 7.2 `react-dom`

다음 안정 공개 API를 지원해야 한다.

- `createPortal`
- `flushSync`
- `preconnect`
- `prefetchDNS`
- `preinit`
- `preinitModule`
- `preload`
- `preloadModule`
- `useFormStatus`

### 7.3 `react-dom/client`

다음 안정 공개 API를 지원해야 한다.

- `createRoot(container, options?)`
- `hydrateRoot(container, reactNode, options?)`
- `root.render(reactNode)`
- `root.unmount()`

다음 root option을 지원해야 한다.

- `onCaughtError`
- `onUncaughtError`
- `onRecoverableError`
- `identifierPrefix`

### 7.4 `react-dom/server`

다음 안정 공개 API를 지원해야 한다.

- `renderToPipeableStream(reactNode, options?)`
- `renderToReadableStream(reactNode, options?)`
- `renderToStaticMarkup(reactNode, options?)`
- `renderToString(reactNode, options?)`
- `resume(reactNode, postponedState, options?)`
- `resumeToPipeableStream(reactNode, postponedState, options?)`

서버 렌더 옵션은 공식 문서 기준의 안정 공개 옵션을 지원해야 한다.
최소 범위는 다음을 포함한다.

- `identifierPrefix`
- `onError`
- bootstrap script / module / asset 계열 옵션
- stream / abort 제어 옵션

### 7.5 `react-dom/static`

다음 안정 공개 API를 지원해야 한다.

- `prerender(reactNode, options?)`
- `prerenderToNodeStream(reactNode, options?)`

정적 prerender 옵션은 공식 문서 기준의 안정 공개 옵션을 지원해야 한다.
최소 범위는 다음을 포함한다.

- `identifierPrefix`
- `onError`
- bootstrap script / module / asset 계열 옵션
- abort 제어 옵션

### 7.6 JSX 런타임 엔트리

다음 엔트리포인트를 지원해야 한다.

- `jsx-runtime`
- `jsx-dev-runtime`

### 7.7 DOM 컴포넌트 및 세부 동작

다음 DOM 컴포넌트와 특수 동작을 지원해야 한다.

- Common DOM components
  - `<div>`를 포함한 일반 HTML / SVG 요소
- Form components
  - `<form>`
  - `<input>`
  - `<option>`
  - `<progress>`
  - `<select>`
  - `<textarea>`
- Resource and metadata components
  - `<link>`
  - `<meta>`
  - `<script>`
  - `<style>`
  - `<title>`

다음 DOM 세부 semantics는 필수다.

- `className`
- `style`
- `dangerouslySetInnerHTML`
- `suppressHydrationWarning`
- `defaultValue`
- `defaultChecked`
- controlled `value`
- controlled `checked`
- `aria-*`
- `data-*`
- callback ref cleanup semantics

## 8. 렌더링 및 reconciliation 요구사항

렌더러는 다음 요구를 만족해야 한다.

- 동일한 element type과 key 조합은 React와 동일한 방식으로 state를 보존해야 한다.
- type 또는 key가 바뀌면 React와 동일한 방식으로 state를 reset해야 한다.
- 형제 재정렬 시 preserve, move, mount, unmount 결과가 React와 호환되어야 한다.
- text, attribute, property, style 업데이트 결과가 React 출력과 호환되어야 한다.
- subtree 삽입, 삭제, 교체, 이동의 commit 결과가 React와 호환되어야 한다.
- fragment 렌더링이 불필요한 wrapper DOM을 만들면 안 된다.
- portal subtree는 context와 event 관점에서 owner tree semantics를 유지해야 한다.
- `Activity`는 hidden 상태에서 state를 보존하고 effects를 정리하며, visible 전환 시 복구해야 한다.
- `Activity`가 hidden으로 전환될 때 ref detach, layout effect cleanup, passive effect cleanup의 관찰 가능 순서는 React와 호환되어야 한다.
- `Activity`가 visible로 복귀할 때 state는 유지되고, 필요한 ref attach와 effect recreate는 React와 호환되는 순서로 수행되어야 한다.
- `Activity` subtree는 Suspense, hydration, transition과 결합되어도 잘못된 full unmount로 붕괴되면 안 된다.

## 9. 상태 및 업데이트 요구사항

런타임은 다음 상태 업데이트 동작에서 React와 호환되어야 한다.

- state batching
- updater 함수 semantics
- reducer dispatch semantics
- action queue semantics
- render scheduling
- commit 순서
- transition updates
- deferred values
- optimistic state
- sync flush 동작

자동 batching은 다음 경계에서 React와 호환되어야 한다.

- React synthetic event 내부 update batching
- native DOM event 내부 update batching
- promise / microtask 내부 update batching
- `setTimeout` / macrotask 내부 update batching
- 동일 tick 내 다중 update 병합 규칙
- `flushSync` 호출 시 batching 강제 종료 및 즉시 flush 규칙

`act`는 테스트 전용 flush boundary로서 다음을 만족해야 한다.

- async `await act(async () => {})` 지원
- sync `act(() => {})`는 React 호환 하위 호환 범위로 지원할 수 있으나, 기본 권장 경로는 async `act`여야 한다.
- act scope 안에서 발생한 render, commit, passive effect, microtask 기반 후속 update를 React와 호환되는 순서로 flush
- act 종료 시점에 DOM, ref, effect가 테스트 관찰 기준에서 안정 상태여야 한다.
- 중첩 act scope와 누락된 act 경고 surface는 React와 호환되어야 한다.
- 테스트 환경은 `IS_REACT_ACT_ENVIRONMENT`와 동등한 전제 구성을 가져야 하며, 미설정 시 React 호환 경고를 노출해야 한다.

## 10. Hook 요구사항

지원하는 hook은 다음을 만족해야 한다.

- 호출 순서 기반 저장
- dependency 비교 규칙
- React가 보장하는 stable identity 보장
- cleanup 시점
- passive / insertion / layout effect의 시점 구분
- invalid hook usage 검출
- `use`의 Promise 및 context read semantics
- `use`는 일반 hook과 달리 조건문 및 반복문 내부 호출을 허용해야 한다.
- `use`는 `try/catch` 내부 호출을 허용하면 안 되며, React 호환 오류 또는 경고 surface를 가져야 한다.
- `useActionState`의 순차 action 처리와 pending state
- `useActionState(action, initialState, permalink?)`의 선택적 `permalink` 계약
- `useEffectEvent`의 호출 제약과 최신 값 관찰 semantics
- `useOptimistic`의 optimistic state 수명과 reset 규칙
- `useSyncExternalStore`의 subscribe, snapshot, `getServerSnapshot` semantics
- `useFormStatus`의 parent `<form>` 추적 semantics
- `useFormStatus`의 `data`, `method`, `action` nullable semantics
- `captureOwnerStack`의 개발 모드 가용성과 `string | null` 반환 semantics

## 11. 클래스 컴포넌트 요구사항

클래스 컴포넌트 지원은 필수다.

다음 공개 동작을 지원해야 한다.

- `Component`
- `PureComponent`
- `setState`
- updater 함수형 `setState`
- callback 형태 `setState`
- `forceUpdate`
- class instance ref 접근
- `context`
- `static contextType`
- `constructor`
- `render`
- `shouldComponentUpdate`
- `componentDidMount`
- `componentDidUpdate`
- `componentWillUnmount`
- `getSnapshotBeforeUpdate`
- `getDerivedStateFromProps`
- `getDerivedStateFromError`
- `componentDidCatch`

명시적으로 제외하지 않은 클래스 컴포넌트 동작은 비지원 상태로 남겨둘 수 없다.

## 12. 이벤트 시스템 요구사항

DOM 렌더러는 지원하는 브라우저 이벤트에 대해 React 호환 synthetic event system을 구현해야 한다.

필수 요구사항은 다음과 같다.

- delegated event listening
- capture 및 bubble 단계 처리
- React 앱에서 기대하는 event object 정규화
- propagation 제어
- default prevention
- handler 교체와 제거
- portal을 통과하는 이벤트 동작

다음 이벤트군은 최소 검증 범위에 포함된다.

- `click`
- `input`
- `change`
- `beforeinput`
- composition events
- `focus`
- `blur`
- keyboard events
- pointer events
- mouse events
- `scroll`
- `wheel`
- `submit`
- `reset`
- `select`

이벤트 시스템은 다음 항목에서 React와 호환되어야 한다.

- synthetic event object shape
- `target`, `currentTarget`, `nativeEvent` 노출 규칙
- IME 입력 중 composition과 input/change 상호작용
- focus/blur delegated 처리와 propagation semantics
- non-bubbling 이벤트의 React 호환 처리
- portal 경유 propagation
- commit 이후 handler 교체 반영 시점

## 13. Form 및 DOM semantics 요구사항

form control과 DOM semantics는 다음을 포함해야 한다.

- controlled / uncontrolled input 판별
- `defaultValue`, `defaultChecked`, `value`, `checked` 반영 시점
- `<form action>`과 `formAction` 흐름
- `useFormStatus`와 form submit pending 흐름
- radio group 기본 동작
- `select` 및 `textarea`의 React 호환 value semantics
- `dangerouslySetInnerHTML`와 hydration 상호작용
- `suppressHydrationWarning`의 한 단계 escape hatch semantics
- 다중 `<form>` 공존 시 가장 가까운 상위 form 경계 기준의 status 해석
- 동시 submit 또는 연속 submit 시 pending, success, error, reset 타이밍의 React 호환 동작
- `useActionState` state 반영, action 에러 반영, `useFormStatus` pending 해제 순서의 React 호환 동작

브라우저별 IME, caret, selection의 극단적 미세 차이는 5.2의 완화 범위를 적용한다.

## 14. SSR, hydration, static prerender 요구사항

### 14.1 SSR

서버 렌더링은 다음을 만족해야 한다.

- `renderToPipeableStream`
- `renderToReadableStream`
- `renderToString`
- `renderToStaticMarkup`
- `resume`
- `resumeToPipeableStream`

SSR은 다음 항목과 호환되어야 한다.

- `identifierPrefix`와 `useId` 연동
- `onError`
- Suspense fallback 처리
- stream 중단 및 fallback 전략
- bootstrap resource 옵션 처리
- web stream과 node stream 환경별 공개 계약 차이
- abort 이후 오류 보고, fallback, 잔여 chunk 처리 순서
- postponed state 생성과 `resume` 입력 수명주기
- bootstrap script / module / asset 출력 순서
- `renderToReadableStream`의 `allReady` promise와 완료 시점 semantics
- `renderToPipeableStream`의 `pipe`, `abort`, `onShellReady`, `onAllReady`, `onShellError`, `onError` callback semantics

### 14.2 Hydration

hydration은 필수 범위다.

다음 항목을 지원해야 한다.

- 서버에서 렌더된 markup을 live tree로 hydrate
- hydration mismatch 탐지 및 처리
- 가능한 경우 기존 DOM 보존
- root option 기반 caught / uncaught / recoverable error reporting
- `identifierPrefix`와 `useId` 연동
- hydration 중 ref 연결 시점
- hydration 중 effect 시점
- hydration 실패 후 client rendering fallback 전환
- `suppressHydrationWarning` 동작

경고 문구는 의미와 발생 조건, 오류 분류가 React와 호환되어야 하며, byte 단위 동일성은 요구하지 않는다.

### 14.3 Static prerender

정적 prerender는 다음을 지원해야 한다.

- `prerender`
- `prerenderToNodeStream`

정적 prerender는 다음 항목과 호환되어야 한다.

- Suspense 기반 데이터 대기
- prerender 중 abort
- `identifierPrefix`
- `onError`
- bootstrap resource 옵션 처리
- postponed state 생성과 이후 resume 연결 가능성
- node stream 환경의 완료 시점과 오류 보고 순서
- `prerender`가 비동기 결과로 `prelude`를 제공하는 공개 반환 shape

Experimental static resume 계열 API는 범위에서 제외한다.

## 15. Suspense, async, transition 요구사항

런타임은 다음을 지원해야 한다.

- `lazy()` 기반 컴포넌트 로딩
- `Suspense` fallback 렌더링
- `use(Promise)` 기반 suspension
- fallback에서 content로의 전환
- promise resolve 이후 recovery
- React와 호환되는 cleanup 및 mount 순서
- `startTransition`
- `useTransition`
- `useDeferredValue`
- `useOptimistic`
- `useActionState`

다음 세부 항목도 React와 호환되어야 한다.

- nested Suspense boundary 선택 규칙
- fallback mount 시 effect와 ref 처리
- resolved content commit 시 cleanup 및 mount 순서
- retry scheduling 시점
- action pending 상태와 transition 경계의 상호작용

## 16. StrictMode, 경고, 진단 요구사항

StrictMode는 단순 marker가 아니라 개발 모드 동작까지 포함해 React와 호환되어야 한다.

필수 요구사항:

- 개발 모드 추가 render 검사
- effect cleanup / recreate 흐름
- ref attach / detach 반복 관찰 가능 동작
- 잘못된 지원 API 사용에 대한 warning surface
- root option의 `onCaughtError`, `onUncaughtError`, `onRecoverableError`
- React와 호환되는 warning 분류와 발생 시점
- `captureOwnerStack`의 개발 모드 전용 가용성과 production 비활성화 semantics

경고 문구는 의미와 오류 종류, 발생 조건을 맞춰야 하며, byte-for-byte 동일성은 요구하지 않는다.

## 17. Profiler 요구사항

Profiler는 단순 export가 아니라 계측 기능까지 포함해 지원해야 한다.

필수 요구사항:

- `id`, `onRender`
- mount / update phase 구분
- `actualDuration`
- `baseDuration`
- `startTime`
- `commitTime`

측정값은 React 수준의 근접도를 만족해야 한다.
정확한 숫자까지 완전히 동일할 필요는 없지만, phase, 시점 관계, 값의 상대적 의미가 달라지면 안 된다.

## 18. 샘플 앱 요구사항

버전 2는 v1 데모 페이지 대신 별도 샘플 앱으로 검증해야 한다.

샘플 앱은 다음을 모두 포함해야 한다.

- 중첩 컴포넌트 조합
- 리스트 삽입, 삭제, 필터링, 재정렬
- controlled form
- context 사용
- 클래스 컴포넌트 사용
- 함수형 컴포넌트 사용
- refs
- portals
- error boundary 흐름
- Suspense 기반 비동기 로딩
- transition
- deferred update
- optimistic update
- action 기반 form 흐름
- hydration 검증 시나리오
- SSR 또는 prerender 기반 초기 HTML 생성 시나리오
- Profiler 계측 확인 시나리오
- `Children`, `memo`, `forwardRef`, `createContext`, `use`, `useActionState`, `useFormStatus` 사용 사례
- resource preloading API 사용 사례
- `Activity`와 `captureOwnerStack` 사용 사례
- `act` 기반 테스트 시나리오

## 19. 테스트 요구사항

### 19.1 Parity 테스트

주 검증 전략은 React와의 parity 테스트다.

테스트는 다음 항목을 직접 비교해야 한다.

- 생성된 DOM
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
- batching 경계 로그
- recoverable error 및 warning 분류

### 19.2 테스트 범주

프로젝트는 다음 테스트를 포함해야 한다.

- element API 테스트
- hook 테스트
- 클래스 컴포넌트 테스트
- reconciliation 테스트
- 이벤트 시스템 테스트
- context 테스트
- ref 테스트
- portal 테스트
- hydration 테스트
- SSR 테스트
- static prerender 테스트
- Suspense 및 lazy 테스트
- transition, deferred, optimistic, action 테스트
- StrictMode 테스트
- Profiler 테스트
- `Activity` 테스트
- `Children` 테스트
- `memo(compare)` 테스트
- `forwardRef` 테스트
- `cloneElement` 테스트
- `act` 테스트
- `captureOwnerStack` 테스트
- `use` 테스트
- `useActionState` 테스트
- `useEffectEvent` 테스트
- `useOptimistic` 테스트
- `useSyncExternalStore` 테스트
- `useFormStatus` 테스트
- form action 동시 submit 테스트
- SSR stream / resume 순서 테스트
- static prerender / postponed state 테스트
- resource preloading API 테스트
- root option 테스트
  - `onCaughtError`
  - `onUncaughtError`
  - `onRecoverableError`
  - `identifierPrefix`
- batching boundary 테스트
  - synthetic event
  - native event
  - promise
  - `setTimeout`
  - `flushSync`
- warning parity 테스트
- 통합 테스트
- 샘플 앱 parity 테스트

### 19.3 승인 기준

선언된 지원 범위 안에서는 다음이 모두 0이어야 한다.

- parity 테스트 실패
- 알려진 동작 불일치
- 문서화되지 않은 누락 범위

단, 5.2에서 완화한 항목은 문서화된 완화 기준으로 판정한다.

## 20. 문서화 요구사항

상위 문서는 최소한 다음 내용을 포함해야 한다.

- 목표 React 버전
- 기준 공식 문서 범위
- 지원 모듈 범위
- 제외 또는 완화 범위
- 공개 API 맵
- 패키지 엔트리포인트
- 아키텍처 요약
- parity 테스트 전략
- 샘플 앱 사용 방식
- SSR, hydration, prerender 전략
- 이벤트 시스템의 검증 범위
- StrictMode, Suspense, Profiler, form semantics 검증 기준
- root option 계약과 batching 경계
- warning과 recoverable error parity 기준
- v1 아카이브 위치

추가 지원 문서는 다음을 포함할 수 있으며, 범위가 커질수록 사실상 필수에 가깝다.

- `parity-matrix.md`
- `ssr-streaming-spec.md`
- `test-strategy.md`

## 21. 산출물

최종 v2 산출물은 다음을 포함해야 한다.

- React 호환 runtime 소스 코드
- DOM renderer 소스 코드
- server renderer 소스 코드
- static prerender 소스 코드
- JSX runtime 엔트리포인트
- 샘플 앱 소스 코드
- parity 테스트 스위트
- `requirements.md`
- `architecture.md`
- `api-spec.md`
- `parity-matrix.md`
- `ssr-streaming-spec.md`
- `test-strategy.md`
- `README.md`
- 보존된 v1 아카이브 자산

## 22. 최종 승인 기준

프로젝트는 다음 조건을 모두 만족해야 완료로 간주한다.

1. 시스템이 7장에서 정의한 안정 공개 API를 노출한다.
2. 시스템이 선언된 지원 범위 안에서 React와 호환된다.
3. parity 테스트 실패가 0이다.
4. 샘플 앱이 본 런타임 위에서 동작하며 필수 기능군을 입증한다.
5. hydration, SSR, static prerender, Suspense, portals, hooks, class components, events가 모두 parity 테스트 또는 통합 테스트로 검증된다.
6. `Profiler`가 공개 API, `onRender` 계약, 근접도 기준까지 검증된다.
7. StrictMode 개발 모드 동작이 parity 테스트 또는 통합 테스트로 검증된다.
8. `createRoot`와 `hydrateRoot`의 공개 옵션이 검증된다.
9. 자동 batching 경계가 synthetic event, native event, promise, `setTimeout`, `flushSync` 기준으로 검증된다.
10. `Children`, `memo(compare)`, `forwardRef`, `cloneElement`, `PureComponent`, `captureOwnerStack`, `use`, `useActionState`, `useFormStatus`, `act`가 검증된다.
11. form DOM semantics와 `<form action>` 흐름이 검증된다.
12. resource preloading API가 공개 계약 수준에서 검증된다.
13. warning과 recoverable error surface가 React와 호환되는 수준으로 검증된다.
14. README가 기준 버전, 지원 범위, 제외 범위, 공개 API, 엔트리포인트, 샘플 앱 방향, SSR/hydration/prerender 전략, batching 경계, warning parity, 이벤트 검증 범위, 아카이브 위치를 모두 설명한다.
15. 문서만으로 범위, 구조, 검증 방법을 이해할 수 있다.
