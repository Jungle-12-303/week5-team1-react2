# React 안정 공개 모듈 호환 아키텍처 v2

## 1. 문서 목적

본 문서는 버전 2 시스템 아키텍처를 정의한다.
버전 2는 공식 React 문서의 안정 공개 모듈을 구현 범위로 삼으므로, 클라이언트 렌더링뿐 아니라 DOM renderer, server renderer, static prerender, resource API, form action 흐름까지 수용할 수 있어야 한다.

본 문서는 다음을 정의한다.

- 아키텍처 계층
- 단계별 책임 경계
- 모듈 소유권 규칙
- 핵심 런타임 계약
- 제외 범위를 고려한 설계 원칙

공식 문서의 `react-dom/hooks`, `react-dom/components`는 API 분류 기준이며, 별도 런타임 패키지 계층을 추가로 뜻하지 않는다.

## 2. 아키텍처 목표

아키텍처는 다음 목표를 동시에 만족해야 한다.

1. 선언된 지원 범위 안에서 React 안정 공개 동작과 호환된다.
2. render, reconcile, commit, schedule, host mutation, server output 책임을 분리한다.
3. 함수형 컴포넌트와 클래스 컴포넌트를 모두 지원한다.
4. hydration, portals, Suspense, StrictMode, form action, resource preload를 예외 경로가 아니라 핵심 흐름 안에서 처리한다.
5. 샘플 앱은 내부 특권 클라이언트가 아니라 공개 런타임의 일반 소비자로 동작해야 한다.

## 3. 상위 시스템 컨텍스트

버전 2는 다음 제품 영역으로 나뉜다.

1. `runtime-core`
   - element API, component model, hooks, context, scheduler, reconciler, diagnostics, Profiler 동작을 담당한다.
2. `renderer-dom`
   - DOM host config, synthetic events, commit 작업, portal 통합, form control, resource hint 적용을 담당한다.
3. `renderer-dom-client`
   - `createRoot`, `hydrateRoot`, root option, hydration bootstrap을 담당한다.
4. `renderer-dom-server`
   - server stream/string rendering, resume 흐름, server option 처리, bootstrap asset 생성을 담당한다.
5. `renderer-dom-static`
   - prerender, prerenderToNodeStream, postponed 상태 생성, 정적 HTML 산출을 담당한다.
6. `sample-app`
   - 공개 API만 사용하여 런타임 동작을 검증하는 실제 소비자 애플리케이션이다.

v1 아카이브 자산은 활성 아키텍처의 일부가 아니다.

## 4. 핵심 단계 모델

### 4.1 Render 단계

책임:

- 현재 트리 상태 읽기
- pending update 처리
- 함수형 컴포넌트 실행
- 클래스 컴포넌트 인스턴스 관리와 render 결과 계산
- context read / provider write 계산
- 다음 child tree 계산
- suspension 여부 결정
- error boundary 후보 탐색
- Profiler 샘플링 시작

비책임:

- host mutation
- passive effect 실행
- 브라우저 이벤트 직접 연결
- stream 출력 전송

### 4.2 Commit 단계

책임:

- host mutation 적용
- ref 연결 및 cleanup 호출
- insertion effect 및 layout effect 호출
- callback ref cleanup 처리
- form control 최종 동기화
- hydration 전환 마무리
- resource hint 반영
- commit 완료 트리 상태 게시
- Profiler commit 구간 측정

비책임:

- 다음 트리 재계산
- passive effect flush

### 4.3 Passive Effect 단계

책임:

- `useEffect` callback 실행
- passive cleanup 실행
- action 완료 후 후속 비동기 상태 반영
- React 호환 ordering 보장

### 4.4 Test Flush 단계

책임:

- `act` scope 안의 update 수집
- commit 이후 passive effect flush
- microtask 기반 후속 update drain
- 테스트 관찰 시점의 안정 상태 보장

비책임:

- production 전용 scheduling 의미 변경
- public runtime 외부의 비공개 shortcut 허용

### 4.5 Server Render 단계

책임:

- React tree를 string 또는 stream으로 직렬화
- Suspense fallback과 postponed 상태 기록
- bootstrap script / module / asset 정보 출력
- server error 처리
- `identifierPrefix` 반영

### 4.6 Resume / Hydration 단계

책임:

- 기존 markup 또는 prerender 상태와 runtime 재연결
- DOM 재사용 가능 여부 판단
- recoverable error 보고
- hydrate 실패 시 client rendering 전환

## 5. 계층별 모듈 경계

### 5.1 Element 계층

책임:

- React element 생성
- key / ref 추출
- child 정규화
- `cloneElement`
- `Children`
- JSX runtime 지원
- `<Context>` provider와 legacy `.Provider` shape 지원

비책임:

- scheduling
- DOM mutation
- hook 실행

### 5.2 Component Runtime 계층

책임:

- 함수형 컴포넌트 실행
- 클래스 컴포넌트 인스턴스 수명주기 처리
- `memo`, `forwardRef`, `lazy`, `Activity` 처리
- error boundary 탐색
- Profiler 범위 시작과 종료 통지
- StrictMode 개발 모드 정책 적용
- `Activity` hidden/visible 전환 시 effect/ref 정책 적용

비책임:

- 직접적인 DOM 쓰기
- 브라우저 이벤트 위임 설치
- stream 직렬화

### 5.3 Hook 계층

책임:

- hook cell 저장
- hook 순서 검증
- dependency 비교
- hook별 queue 동작
- effect 등록
- `use`, `useActionState`, `useOptimistic`, `useSyncExternalStore`, `useFormStatus` bookkeeping
- `useEffectEvent`의 최신 값 바인딩
- `use`의 조건부/반복 호출 허용과 `try/catch` 금지 규칙 처리

비책임:

- DOM mutation
- host scheduling API 직접 호출
- form submit 직접 처리

### 5.4 Scheduler 계층

책임:

- lane 또는 priority 추적
- update batching
- sync / deferred work 조정
- transition 처리
- action pending 상태와 transition 상호작용 조정
- passive effect flush 트리거 관리
- synthetic event, native event, promise, `setTimeout` 경계에서 batching 보장
- `flushSync`에 의한 강제 flush 경계 처리

비책임:

- host node 생성
- stream 전송

### 5.5 Reconciler 계층

책임:

- current와 next work 비교
- key 및 type 규칙에 따른 state 보존 또는 폐기
- class lifecycle 단계 구분
- commit용 effect 목록 생성
- mount, update, delete, move, hydration 판단
- `Activity` hidden/visible 전환 시 subtree 상태 보존

비책임:

- host별 DOM 조작
- warning 출력

### 5.6 Diagnostics 계층

책임:

- 개발 모드 warning 분류
- `onCaughtError`, `onUncaughtError`, `onRecoverableError` 연결
- component stack / owner stack 수준의 진단 정보 생성
- `captureOwnerStack` 지원
- recoverable error와 invariant failure 분리
- Profiler 계측 이벤트 집계

비책임:

- 렌더 순서 변경
- host mutation

### 5.7 Renderer DOM 계층

책임:

- host node 생성 및 업데이트
- text node 업데이트
- property 및 style diff 적용
- `dangerouslySetInnerHTML` 처리
- `suppressHydrationWarning` 처리
- controlled / uncontrolled form control 처리
- `<form action>` 및 `formAction` wiring
- `<input>`, `<textarea>`, `<select>`, `<option>`, `<progress>` semantics 처리
- `<link>`, `<meta>`, `<script>`, `<style>`, `<title>` 반영
- resource hint API와 DOM 반영 연결
- event delegation bridge
- synthetic event normalization
- hydration matching
- portal container 관리

비책임:

- hook bookkeeping
- 클래스 라이프사이클 정책
- server stream 생성

### 5.8 Client Root 계층

책임:

- `createRoot`, `hydrateRoot` 구현
- root 객체 수명주기 관리
- root option 저장과 diagnostics 연결
- hydration 진입과 client-only 진입 구분

### 5.9 Server Renderer 계층

책임:

- `renderToString`
- `renderToStaticMarkup`
- `renderToReadableStream`
- `renderToPipeableStream`
- `resume`
- `resumeToPipeableStream`
- stream 옵션과 bootstrap asset 처리
- suspended subtree와 postponed state 직렬화
- callback 순서와 abort semantics 보장
- `ReadableStream.allReady`, `pipe()`, `abort()`와 callback surface 노출

### 5.10 Static Renderer 계층

책임:

- `prerender`
- `prerenderToNodeStream`
- postponed state 생성
- static resume 대상 출력 생성
- 완료 시점과 오류 보고 순서 보장
- `prelude` 반환 shape 구성

### 5.11 Sample App 계층

책임:

- 공개 엔트리포인트만 소비
- 실제 앱 흐름에서 런타임 동작 검증
- SSR, hydration, action, optimistic UI, resource preload 시나리오 제공
- `act` 기반 테스트 및 개발 진단 시나리오 제공

## 6. 핵심 런타임 계약

### 6.1 Element Shape

정규 element 계약은 최소한 다음 필드를 포함해야 한다.

- `type`
- `key`
- `ref`
- `props`
- 개발 모드 owner / debug metadata

### 6.2 Work Unit

영속 트리 노드는 최소한 다음 정보를 가져야 한다.

- element identity
- component kind
- parent / child / sibling 링크
- current / work-in-progress alternate 링크
- pending props와 memoized props
- pending state와 memoized state
- effect flags
- update queue
- ref 상태
- hydration 상태
- visibility 상태
- profiler metadata

### 6.3 Update Queue

update queue는 명시적 자료구조여야 한다.
다음 경로를 모두 수용해야 한다.

- 클래스 `setState`
- reducer dispatch
- state updater 함수
- transition update
- optimistic update
- action 결과 update

### 6.4 Effect Record

effect bookkeeping은 최소한 다음 구분을 가져야 한다.

- insertion effects
- layout effects
- passive effects
- ref cleanup
- callback ref cleanup
- mount / update / unmount phase

### 6.5 Root Contract

root 객체는 최소한 다음 상태를 추적해야 한다.

- container
- 현재 commit된 트리
- pending work
- hydration mode
- scheduler 상태
- pending passive effects
- pending action status
- StrictMode 및 개발 모드 플래그
- diagnostics handler
- act scope depth 또는 test flush 상태

## 7. 이벤트 아키텍처

이벤트 시스템은 중앙집중형 delegated 구조여야 한다.

필수 규칙:

- host node가 이벤트마다 raw browser listener를 개별 소유하면 안 된다.
- 이벤트 추출과 dispatch는 renderer 계층의 책임이다.
- 논리적 propagation은 commit된 component tree를 따라야 한다.
- portal 경유 propagation도 owner tree semantics를 유지해야 한다.
- synthetic event object는 React 앱이 기대하는 shape를 제공해야 한다.

이벤트 아키텍처는 다음 하위 책임을 가져야 한다.

- 브라우저 이벤트 수집
- event priority 분류
- synthetic event object 생성
- capture / bubble dispatch
- 최신 handler 참조 보장
- composition, input, change, focus/blur, scroll, submit, reset 정규화

## 8. SSR, hydration, static 아키텍처

SSR과 hydration은 DOM renderer 바깥의 별도 1급 계층으로 다뤄야 한다.

필수 규칙:

- SSR 출력 로직과 hydration matching 로직을 분리한다.
- string, web stream, node stream 출력을 공통 직렬화 핵심 위에 쌓는다.
- resume는 prerender/postponed state와 직접 연결된다.
- hydration mismatch와 recoverable error는 diagnostics 계층을 통해 보고한다.
- `identifierPrefix`와 `useId` 연동은 runtime, server, client가 함께 책임진다.
- `suppressHydrationWarning`은 host diff 단계가 아닌 hydration 정책 계층에서 해석한다.
- bootstrap asset 출력 순서와 abort 이후 오류 surface는 server/static 계층이 책임진다.

## 9. Suspense, async, action 아키텍처

Suspense와 async 흐름은 여러 계층의 협업으로 구현한다.

규칙:

- render 중 발생한 thrown Promise 또는 action pending record를 포착해야 한다.
- fallback 선택은 reconciler / runtime 정책이 담당한다.
- retry scheduling은 scheduler가 담당한다.
- server renderer는 suspended subtree와 fallback을 직렬화할 수 있어야 한다.
- `useActionState`와 `<form action>`은 action state 계층을 공유해야 한다.
- `useOptimistic`는 base state와 optimistic patch를 분리 저장해야 한다.
- action success/error/reset 이후 state 확정과 pending 해제 순서는 scheduler와 action state 계층이 함께 보장해야 한다.

## 10. Form action 아키텍처

form 관련 기능은 단순 DOM prop 처리로 환원하면 안 된다.

필수 규칙:

- `<form action>`과 `formAction` 호출 경로는 scheduler와 action state에 연결된다.
- `useFormStatus`는 가장 가까운 상위 form submit 상태를 구독한다.
- submit pending, success, error는 diagnostics 및 update queue와 연결된다.
- controlled/uncontrolled policy는 host prop 대입보다 상위 계층 정책으로 유지한다.
- 다중 form 경계와 동시 submit 해석은 별도 form context 정책으로 관리한다.
- same-component local form과 상위 form 경계를 혼동하지 않도록 provider/read 경계를 명확히 유지한다.

## 11. 오류 및 경고 아키텍처

오류는 명시적 런타임 경로를 따라 전파되어야 한다.

필수 규칙:

- render 단계 오류는 error boundary 탐색으로 연결된다.
- uncaught error는 root option handler와 diagnostics에 전달된다.
- recoverable error는 hydration/SSR/client root에서 일관되게 보고된다.
- 개발 모드 warning은 중앙 diagnostics 계층에서 분류한다.
- 경고 문자열은 완전 동일성이 아니라 의미와 분류의 호환성을 목표로 한다.
- `captureOwnerStack`는 diagnostics 계층의 dev-only capability로 유지한다.

## 12. Test Flush 아키텍처

`act`는 테스트 환경 전용 coordination 계층으로 다뤄야 한다.

필수 규칙:

- scheduler는 act scope 안에서 발생한 update를 별도로 추적할 수 있어야 한다.
- commit 이후 passive effect와 microtask 기반 후속 update를 act 종료 전에 drain 해야 한다.
- act는 production scheduling 의미를 바꾸는 public runtime shortcut이 아니어야 한다.
- diagnostics는 누락된 act warning을 분류할 수 있어야 한다.
- async act를 기본 경로로 취급하고, sync act는 호환 레이어로 다뤄야 한다.
- 테스트 환경 플래그는 `IS_REACT_ACT_ENVIRONMENT`와 호환되는 의미를 가져야 한다.

## 13. Profiler 아키텍처

Profiler는 단순 콜백이 아니라 계측 시스템으로 다뤄야 한다.

필수 규칙:

- render와 commit 단계에서 timing 데이터를 수집한다.
- `onRender` 인자 계산은 runtime-core가 수행한다.
- renderer는 commit 시간과 host 작업 시간을 공급한다.
- diagnostics 계층은 parity 검증용 로그를 수집한다.
- 수치 자체는 허용 오차 기반 근접도 판정으로 검증한다.

## 14. 소유권 규칙

다음 제약은 필수다.

- scheduler는 DOM을 직접 mutate하지 않는다.
- DOM renderer는 hook state를 소유하지 않는다.
- hooks는 update queue를 우회하지 않는다.
- client root는 server 직렬화를 직접 구현하지 않는다.
- server renderer는 DOM node를 생성하지 않는다.
- hydration 정책은 일반 prop diff 유틸리티 안에 숨은 조건문으로 섞지 않는다.
- event delegation은 renderer 책임으로 유지한다.
- form action 정책은 일반 event helper에 흩어지지 않도록 중앙 관리한다.
- warning과 recoverable error 처리는 console 부수효과에 흩어지지 않도록 중앙집중형으로 관리한다.
- act coordination은 임시 테스트 helper 내부 로컬 상태가 아니라 scheduler/root 계약으로 관리한다.

## 15. 권장 활성 구조

활성 저장소 구조는 다음과 유사한 방향으로 발전해야 한다.

```txt
/docs
  requirements.md
  architecture.md
  api-spec.md
  parity-matrix.md
  ssr-streaming-spec.md
  test-strategy.md

/src
  /runtime-core
    /element
    /component
    /context
    /hooks
    /scheduler
    /reconciler
    /diagnostics
    /shared
    index.js
    jsx-runtime.js
    jsx-dev-runtime.js

  /renderer-dom
    /host
    /events
    /form
    /resources
    /portal
    /hydration
    index.js

  /renderer-dom-client
    index.js

  /renderer-dom-server
    index.js

  /renderer-dom-static
    index.js

  /sample-app
    ...

  /tests
    /parity
    /runtime
    /renderer-dom
    /server
    /static
    /integration
```

v1 자산은 `archive/v1` 아래에 보관한다.

## 16. 비목표

이 아키텍처는 다음을 요구하지 않는다.

- React 내부 자료구조의 byte-for-byte 복제
- private internals 호환
- Experimental / Canary API 호환
- React Compiler, DevTools protocol, React Native renderer 지원
- byte-for-byte warning 문자열 일치
- 모든 브라우저별 IME, caret, selection 미세 동작의 완전 동일성
- Profiler 수치의 완전 동일성

단, 위 비목표가 안정 공개 API의 의미적 호환성을 약화시키는 핑계가 되어서는 안 된다.
