# React 안정 공개 모듈 호환 API 명세 v2

## 1. 문서 목적

본 문서는 버전 2의 공개 API 계약을 정의한다.
버전 2는 공식 React 문서의 안정 공개 모듈을 기준으로 runtime, DOM, client root, server rendering, static prerender API를 제공한다.

본 문서는 다음을 정의한다.

- 지원하는 패키지 엔트리포인트
- 필수 export
- 상위 수준 호출 계약
- 안정성 범위와 제외 범위

## 2. 호환 원칙

공개 API는 v2 지원 범위 안에서 공식 React 문서의 안정 공개 동작과 호환되어야 한다.
공식 문서에 등재된 안정 공개 API는, 본 문서에서 명시적으로 제외하지 않는 한 지원 대상으로 본다.
Canary, Experimental, undocumented API는 지원 대상이 아니다.

## 3. 패키지 엔트리포인트

패키지는 다음과 동등한 엔트리포인트를 제공해야 한다.

- 패키지 루트
- `package/jsx-runtime`
- `package/jsx-dev-runtime`
- `package/dom`
- `package/dom/client`
- `package/dom/server`
- `package/dom/static`

구체적인 패키지 이름은 React와 달라도 되지만, export 표면과 호출 semantics는 React와 호환되어야 한다.
공식 문서의 `react-dom/hooks`, `react-dom/components`는 API 분류 기준이며, 본 문서의 패키지 엔트리포인트 목록과는 별개다.

## 4. 패키지 루트 export

패키지 루트는 다음 안정 공개 API와 호환되는 export를 제공해야 한다.

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

다음은 범위에서 제외한다.

- `cache`
- `cacheSignal`
- `captureOwnerStack`의 문자열 완전 동일 계약
- Canary / Experimental API

## 5. 주요 루트 API 계약

### 5.1 `createContext(defaultValue)`

`createContext(defaultValue)`는 context 객체를 반환해야 한다.
context 객체는 다음을 지원해야 한다.

- `SomeContext` 자체를 provider로 렌더링하는 최신 provider 계약
- `SomeContext.Provider` legacy provider 계약
- `SomeContext.Consumer` render-prop 계약
- default value fallback
- nested provider override

`SomeContext.Consumer`와 `useContext(SomeContext)`는 동일한 context resolution semantics를 따라야 한다.

### 5.2 `Children`

다음을 지원해야 한다.

- `Children.map(children, fn, thisArg?)`
- `Children.forEach(children, fn, thisArg?)`
- `Children.count(children)`
- `Children.only(children)`
- `Children.toArray(children)`

배열화, key 보존, nullish child 처리 규칙은 React와 호환되어야 한다.

### 5.3 `memo(Component, compare?)`

- `compare`가 없으면 React 기본 shallow compare semantics를 따른다.
- `compare(prevProps, nextProps)`가 `true`를 반환하면 update를 건너뛴다.
- ref 전달 여부와 display name 처리도 React 호환 semantics를 따라야 한다.

### 5.4 `forwardRef(render)`

- `render(props, ref)` 호출 규칙을 따른다.
- ref 인자는 React와 동일한 시점에 연결 또는 해제되어야 한다.
- `memo(forwardRef(...))` 조합이 동작해야 한다.

### 5.5 `cloneElement(element, props?, ...children)`

- 기존 `props`를 기준으로 새 `props`를 병합한다.
- 전달된 `children`이 있으면 기존 child를 override한다.
- `key`와 `ref` override 규칙은 React와 일치해야 한다.
- 반환 element는 `isValidElement`와 호환되어야 한다.

### 5.6 `Component` 및 `PureComponent`

다음 공개 동작을 지원해야 한다.

- `props`
- `state`
- `context`
- `setState`
- `forceUpdate`
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

`PureComponent`는 props와 state의 shallow compare를 사용해야 한다.

### 5.7 `Profiler`

`Profiler`는 다음 props를 지원해야 한다.

- `id`
- `onRender`

`onRender`는 다음 인자를 React와 호환되는 순서로 제공해야 한다.

- `id`
- `phase`
- `actualDuration`
- `baseDuration`
- `startTime`
- `commitTime`

수치 자체는 완전 동일성이 아니라 근접도 기준을 적용한다.

### 5.8 `Activity`

`Activity`는 다음 동작을 지원해야 한다.

- visible 상태 렌더링
- hidden 상태 전환
- hidden 상태에서 state 보존
- hidden 상태에서 effect cleanup
- visible 복귀 시 subtree 재활성화
- hidden 전환 시 ref detach, layout effect cleanup, passive effect cleanup의 관찰 가능 순서는 React와 호환되어야 한다.
- visible 복귀 시 state는 유지되고 ref attach, effect recreate 순서는 React와 호환되어야 한다.
- Suspense, hydration, transition과 결합될 때도 subtree identity가 불필요하게 파괴되면 안 된다.

### 5.8.1 `act(scope)`

`act`는 테스트 전용 flush boundary를 제공해야 한다.

지원 형태:

- `await act(async () => {})`
- `act(() => {})`

세부 규칙:

- async `act`가 기본 권장 경로여야 한다.
- act scope 안에서 발생한 render, commit, passive effect, microtask 기반 후속 update를 React와 호환되는 순서로 flush해야 한다.
- act 종료 시점에 DOM, ref, effect는 테스트 관찰 기준에서 안정 상태여야 한다.
- 중첩 act scope 처리와 누락된 act warning surface는 React와 호환되어야 한다.
- production runtime 보장과 테스트용 강제 flush 보장을 혼동하면 안 된다.
- `IS_REACT_ACT_ENVIRONMENT`와 동등한 테스트 환경 플래그 semantics를 따라야 한다.

### 5.9 `captureOwnerStack()`

- 개발 모드에서 현재 owner stack 문자열 또는 `null`을 반환해야 한다.
- 호출 가능 시점과 반환 가능성은 React와 호환되어야 한다.
- 문자열의 정확한 byte 단위 일치는 요구하지 않지만, 진단 목적의 의미는 유지해야 한다.
- production에서는 비활성화되거나 `null`을 반환하는 React 호환 semantics를 따라야 한다.

## 6. Hook 계약

### 6.1 기본 hook

다음 hook은 React와 호환되는 호출 규칙과 반환 shape를 가져야 한다.

- `useState`
- `useReducer`
- `useRef`
- `useMemo`
- `useCallback`
- `useContext`
- `useDebugValue`
- `useImperativeHandle`
- `useId`

### 6.2 effect 계열 hook

다음 hook은 dependency semantics와 실행 순서를 따라야 한다.

- `useEffect`
- `useLayoutEffect`
- `useInsertionEffect`
- `useEffectEvent`

세부 규칙:

- `useInsertionEffect`는 host mutation 직전 스타일 삽입 계열 시점에 실행되어야 한다.
- `useEffectEvent`는 최신 props/state를 읽되 effect 외부에 그대로 노출된 일반 callback처럼 동작하면 안 된다.

### 6.3 async 및 transition hook

다음을 지원해야 한다.

- `useTransition`
- `useDeferredValue`
- `useOptimistic`
- `useActionState`
- `use`

세부 규칙:

- `useTransition`은 `[isPending, startTransition]`을 반환한다.
- `useDeferredValue`는 비긴급 값 지연 semantics를 따른다.
- `useOptimistic`은 base state와 optimistic overlay를 관리한다.
- `useActionState`는 `[state, formAction, isPending]` shape를 지원해야 한다.
- `use(Promise)`는 suspension semantics를, `use(Context)`는 context read semantics를 따라야 한다.
- `useActionState`는 연속 action 제출 시 순차 반영, pending 유지, success/error 이후 state 확정 순서가 React와 호환되어야 한다.
- `useActionState(action, initialState, permalink?)`의 선택적 `permalink` 인자를 지원해야 한다.
- `use`는 조건문과 반복문 안에서 호출 가능해야 한다.
- `use`는 `try/catch` 안에서 호출되면 안 되며 React 호환 오류 surface를 가져야 한다.

### 6.4 external store hook

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`는 다음을 따라야 한다.

- subscribe / unsubscribe 수명주기
- snapshot 변경 감지
- hydration 시 `getServerSnapshot` 사용
- stale snapshot 방지

## 7. `package/dom` export

이 엔트리포인트는 다음을 export해야 한다.

- `createPortal(children, container, key?)`
- `flushSync(callback)`
- `preconnect(href, options?)`
- `prefetchDNS(href)`
- `preinit(href, options?)`
- `preinitModule(href, options?)`
- `preload(href, options?)`
- `preloadModule(href, options?)`
- `useFormStatus()`

### 7.1 `createPortal(children, container, key?)`

- 지정된 host container에 렌더링한다.
- context 관점에서 owner tree semantics를 유지한다.
- 이벤트 전파는 owner tree 기준으로 동작해야 한다.

### 7.2 `flushSync(callback)`

- batching을 즉시 종료하고 callback 내부 update를 동기적으로 flush한다.
- flush 이후 DOM과 layout observable state는 commit 완료 상태여야 한다.

### 7.3 resource hint API

다음 resource API는 React 문서의 안정 공개 semantics를 따라야 한다.

- `preconnect`
- `prefetchDNS`
- `preinit`
- `preinitModule`
- `preload`
- `preloadModule`

중복 호출 병합, 옵션 해석, host 반영 타이밍은 React와 호환되어야 한다.

### 7.4 `useFormStatus()`

`useFormStatus()`는 다음 shape를 지원해야 한다.

- `pending`
- `data`
- `method`
- `action`

가장 가까운 상위 `<form>`의 submit 상태를 읽어야 한다.
동시 submit, 연속 submit, 중첩 form 경계에서 pending / data / action 해석은 React와 호환되어야 한다.
같은 컴포넌트 안에서 정의한 `<form>`을 자기 자신이 바로 추적하는 것으로 오해되면 안 되며, 가장 가까운 상위 form 경계 semantics를 따라야 한다.
submit 전 또는 비연결 상태에서는 `data`, `method`, `action`이 `null`이 될 수 있는 React 호환 semantics를 따라야 한다.

## 8. `package/dom/client` 계약

### 8.1 `createRoot(container, options?)`

`createRoot(container, options?)`는 root 객체를 반환해야 한다.
root 객체는 다음 메서드를 지원해야 한다.

- `root.render(children)`
- `root.unmount()`

지원 옵션:

- `onCaughtError`
- `onUncaughtError`
- `onRecoverableError`
- `identifierPrefix`

세부 규칙:

- `render()`는 같은 root에 대한 재렌더를 수행한다.
- `unmount()`는 subtree와 ref, effect를 정리한다.
- error option callback은 React와 호환되는 시점과 분류로 호출되어야 한다.

### 8.2 `hydrateRoot(container, reactNode, options?)`

`hydrateRoot`는 기존 markup에 runtime 동작을 연결해야 한다.

세부 규칙:

- 가능한 경우 기존 DOM을 재사용한다.
- mismatch는 React와 호환되는 방식으로 보고하거나 교정한다.
- `identifierPrefix`는 `useId`와 함께 동작해야 한다.
- `onCaughtError`, `onUncaughtError`, `onRecoverableError`는 React와 호환되는 방식으로 동작해야 한다.
- `onRecoverableError`는 recoverable hydration mismatch를 보고해야 한다.
- `suppressHydrationWarning`은 한 단계 mismatch escape hatch로 동작해야 한다.

## 9. `package/dom/server` 계약

이 엔트리포인트는 다음 API를 export해야 한다.

- `renderToPipeableStream`
- `renderToReadableStream`
- `renderToStaticMarkup`
- `renderToString`
- `resume`
- `resumeToPipeableStream`

### 9.1 `renderToString(reactNode, options?)`

- 동기 string 렌더 결과를 반환한다.
- `identifierPrefix` 등 안정 공개 옵션을 반영해야 한다.

### 9.2 `renderToStaticMarkup(reactNode, options?)`

- 비상호작용 정적 markup을 반환한다.
- hydration 대상이 아닌 static HTML semantics를 따라야 한다.

### 9.3 stream API

다음 stream API는 React 문서의 안정 공개 계약을 따라야 한다.

- `renderToPipeableStream`
- `renderToReadableStream`
- `resume`
- `resumeToPipeableStream`

최소 지원 범위:

- bootstrap scripts / modules / assets 옵션
- `identifierPrefix`
- `onError`
- abort / timeout 제어
- Suspense fallback stream 처리
- postponed state resume
- bootstrap asset 출력 순서
- web stream / node stream 환경별 완료 및 오류 surface 차이
- abort 이후 오류 보고와 잔여 output 처리 순서
- `renderToReadableStream()` 반환값의 `ReadableStream`과 `allReady`
- `renderToPipeableStream()` 반환값의 `pipe()`와 `abort()`
- `onShellReady`, `onAllReady`, `onShellError`, `onError` callback surface

## 10. `package/dom/static` 계약

이 엔트리포인트는 다음 API를 export해야 한다.

- `prerender`
- `prerenderToNodeStream`

세부 규칙:

- prerender는 HTML과 resume를 위한 상태를 생성할 수 있어야 한다.
- Suspense와 postponed state를 static 흐름에 맞게 처리해야 한다.
- `identifierPrefix`, `onError`, bootstrap asset 옵션을 지원해야 한다.
- 완료 시점과 postponed state 반환 시점은 React와 호환되어야 한다.
- `prerender()`는 비동기 결과로 `prelude`와 postponed state를 포함하는 React 호환 반환 shape를 가져야 한다.

다음 API는 범위에서 제외한다.

- `resumeAndPrerender`
- `resumeAndPrerenderToNodeStream`

## 11. JSX runtime 계약

### 11.1 `package/jsx-runtime`

다음을 export해야 한다.

- `Fragment`
- `jsx`
- `jsxs`

### 11.2 `package/jsx-dev-runtime`

다음을 export해야 한다.

- `Fragment`
- `jsxDEV`

개발 모드 metadata는 React 개발 빌드와 의미적으로 호환되어야 한다.

## 12. DOM 컴포넌트 계약

다음 DOM 컴포넌트는 React와 호환되는 host semantics를 가져야 한다.

- common DOM components
- `<form>`
- `<input>`
- `<option>`
- `<progress>`
- `<select>`
- `<textarea>`
- `<link>`
- `<meta>`
- `<script>`
- `<style>`
- `<title>`

### 12.1 form semantics

다음을 지원해야 한다.

- controlled `value`
- controlled `checked`
- `defaultValue`
- `defaultChecked`
- `<form action>`
- `formAction`
- radio group 동작
- `select` value 및 option selection semantics
- `textarea` value semantics

### 12.2 hydration 관련 prop

다음을 지원해야 한다.

- `dangerouslySetInnerHTML`
- `suppressHydrationWarning`

`suppressHydrationWarning`은 한 단계 mismatch escape hatch로 동작해야 한다.

## 13. 이벤트 계약

지원 이벤트 API는 다음 관찰 가능 동작에서 React와 호환되어야 한다.

- delegated registration
- capture 및 bubble dispatch
- synthetic event object 접근
- `preventDefault`
- `stopPropagation`
- handler 교체
- portal-aware propagation

명시적 검증 범위:

- `click`
- `input`
- `change`
- `beforeinput`
- composition events
- focus / blur
- keyboard events
- pointer events
- mouse events
- `scroll`
- `wheel`
- `submit`
- `reset`
- `select`

## 14. Batching 계약

자동 batching은 다음 경계에서 React와 호환되어야 한다.

- React synthetic event
- native DOM event
- promise / microtask
- `setTimeout`
- `flushSync`

## 15. StrictMode 및 warning 계약

개발 모드 동작은 지원 범위 안에서 React 호환 StrictMode 효과를 제공해야 한다.

지원 범위:

- 추가 render 검사
- effect cleanup / recreate 흐름
- ref attach / detach 반복
- warning 분류
- root error callback surface

warning 문자열의 완전 동일성은 요구하지 않지만, 의미와 발생 조건은 맞아야 한다.

## 16. 안정성 규칙

다음은 v2의 stable public contract다.

- 문서화된 패키지 엔트리포인트
- 본 문서에 명시한 export
- 본 문서에 명시한 root 객체 메서드
- hook 호출 시그니처
- element 생성 규칙
- server / static renderer 공개 함수

다음은 public API가 아니다.

- 내부 tree node field
- scheduler internals
- renderer implementation helper
- undocumented debug metadata field

## 17. 오류 처리 규칙

공개 API는 예측 가능한 방식으로 실패해야 한다.

필수 규칙:

- 잘못된 지원 사용은 React 호환 error 또는 warning으로 드러나야 한다.
- unsupported internals 문제를 조용히 숨기면 안 된다.
- renderer failure가 root ownership state를 조용히 손상시키면 안 된다.
- recoverable error는 무시되지 않고 root option 또는 diagnostics로 전달되어야 한다.

## 18. 검증 규칙

본 API 명세는 문서화된 엔트리포인트와 동작이 지원 범위 안에서 React와 호환됨을 parity 테스트로 입증했을 때만 충족된 것으로 본다.
