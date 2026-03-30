# Week5 v3 시스템 아키텍처

## 1. 아키텍처 목표

v3 아키텍처는 week5 과제의 핵심 제약을 지키면서도, 기존 저장소의 Virtual DOM / Diff / Patch 자산을 최대한 재사용하는 것을 목표로 한다.

핵심 원칙은 다음과 같다.

- 루트에만 상태를 둔다.
- 자식은 stateless component로 유지한다.
- Hook 상태는 루트 `FunctionComponent`가 소유한다.
- VDOM 생성과 DOM 반영은 분리한다.
- Diff / Patch 계층은 기존 `src/core` 자산을 우선 재사용한다.

## 2. 상위 구조

v3의 상위 구조는 다음 계층으로 나눈다.

1. `App Layer`
2. `Component Runtime Layer`
3. `Hook Runtime Layer`
4. `VNode Layer`
5. `Component Resolver Layer`
6. `Reconciler Layer`
7. `DOM Renderer Layer`
8. `Test Layer`

## 3. 계층별 책임

### 3.1 App Layer

App Layer는 과제 데모 애플리케이션을 담당한다.

- 루트 컴포넌트 정의
- 루트 상태 설계
- 자식 stateless component 구성
- 사용자 이벤트 연결
- 화면 주제와 사용자 흐름 설계

App Layer는 상태 저장의 실제 구현을 직접 가지지 않는다.
상태 저장과 렌더 예약은 `FunctionComponent`와 Hook Runtime이 담당한다.

### 3.2 Component Runtime Layer

Component Runtime Layer의 중심은 `FunctionComponent` 클래스다.

`FunctionComponent`는 최소한 다음 상태를 가진다.

- `renderFn`
- `hooks`
- `hookCursor`
- `currentProps`
- `currentVNode`
- `rootElement`
- `isMounted`
- `pendingEffects`
- `cleanupEffects`

주요 책임은 다음과 같다.

- 루트 컴포넌트 mount
- 상태 변경 후 update
- 루트 종료 시 unmount
- Hook 실행 컨텍스트 초기화
- 렌더 함수 실행
- VDOM 교체 시점 제어
- effect commit 예약
- effect cleanup 실행

자식 컴포넌트는 `FunctionComponent` 인스턴스를 따로 만들지 않는다.
자식은 루트 렌더 중 호출되는 순수 함수이며, `props` 입력에 대해 VNode를 반환한다.
이 호출과 전개는 별도의 component resolver 단계가 담당한다.

### 3.3 Hook Runtime Layer

Hook Runtime Layer는 루트 컴포넌트의 `hooks` 배열을 기반으로 작동한다.

필수 구성 요소는 다음과 같다.

- 현재 활성 루트 컴포넌트를 가리키는 dispatcher
- Hook 인덱스를 증가시키는 cursor
- 상태 슬롯
- effect 슬롯
- memo 슬롯
- dependency 비교 유틸리티
- update scheduling 유틸리티
- effect commit 유틸리티

#### useState

- 각 `useState` 호출은 자신의 슬롯을 가진다.
- 슬롯에는 현재 값과 setter가 저장된다.
- setter는 다음 렌더를 예약하거나 즉시 수행한다.
- 함수형 업데이트를 허용한다.
- 이미 `unmount`된 루트에 대한 setter 호출은 no-op으로 처리한다.

#### useEffect

- 각 `useEffect` 슬롯은 `deps`, `create`, `cleanup`을 가진다.
- 렌더 단계에서는 effect 실행 여부만 결정한다.
- 실제 effect 실행은 DOM patch 이후 commit 단계에서 수행한다.
- 이전 cleanup이 있으면 새 effect 실행 전에 먼저 호출한다.

#### useMemo

- 각 `useMemo` 슬롯은 `deps`, `value`를 가진다.
- dependency가 유지되면 계산 함수를 재실행하지 않는다.

### 3.4 VNode Layer

VNode Layer는 선언형 UI를 구조화된 데이터로 바꾸는 계층이다.

재사용 우선 대상은 다음 모듈이다.

- `src/core/vnode/h.js`
- `src/core/vnode/index.js`
- `src/core/vnode/normalizeChildren.js`

책임은 다음과 같다.

- element VNode 생성
- 텍스트/배열/중첩 자식 정규화
- `key`와 일반 `props` 분리
- 이벤트 prop 전달 구조 유지

### 3.5 Component Resolver Layer

Component Resolver Layer는 `h(Child, props)`처럼 선언된 자식 함수형 컴포넌트를 실제 VNode 트리로 전개하는 계층이다.

책임은 다음과 같다.

- 함수형 자식 컴포넌트 식별
- 자식 컴포넌트에 `props` 주입
- 반환값을 일반 VNode 트리로 정규화
- Hook 사용이 금지된 자식 컴포넌트 규칙 검증
- diff 이전 단계에서 최종 렌더 트리 확정

### 3.6 Reconciler Layer

Reconciler Layer는 이전 VDOM과 다음 VDOM을 비교해 patch 목록을 만든다.

재사용 우선 대상은 다음 모듈이다.

- `src/core/reconciler/diff.js`
- `src/core/reconciler/diffChildren.js`
- `src/core/reconciler/diffProps.js`

필수 책임은 다음과 같다.

- 노드 교체 판단
- 텍스트 변경 감지
- props 변경 감지
- 이벤트 변경 감지
- child list 추가/삭제/이동 계산
- `key` 기반 항목 매칭

### 3.7 DOM Renderer Layer

DOM Renderer Layer는 patch를 실제 DOM에 반영한다.

재사용 우선 대상은 다음 모듈이다.

- `src/core/renderer-dom/createDom.js`
- `src/core/renderer-dom/patch.js`
- `src/core/renderer-dom/applyProps.js`
- `src/core/renderer-dom/applyEvents.js`

책임은 다음과 같다.

- 최초 DOM 생성
- patch 적용
- 속성 반영
- 이벤트 바인딩/교체/해제
- 텍스트 갱신
- 기본 form semantics 반영

기본 form semantics 범위는 아래와 같다.

- text input의 `value`
- checkbox input의 `checked`
- textarea의 `value`
- select의 `value`
- `onInput`과 `onChange`를 통한 상태 반영

### 3.8 Test Layer

Test Layer는 단위 테스트와 기능 테스트를 분리한다.

- 단위 테스트: Hook 슬롯, resolver, diff 결과, patch 동작, memo 캐시, form semantics
- 기능 테스트: 브라우저 부트스트랩, 사용자 이벤트, 루트 상태 전파, unmount cancellation

## 4. 핵심 데이터 흐름

### 4.1 최초 mount

최초 mount 흐름은 다음과 같다.

1. 루트 `FunctionComponent` 생성
2. `mount(root, props)` 호출
3. Hook dispatcher를 현재 루트로 설정
4. 루트 `renderFn(props)` 실행
5. Component Resolver가 자식 stateless component를 전개
6. 최종 VDOM 생성
7. VDOM을 실제 DOM으로 변환
8. DOM을 root에 부착
9. commit 단계에서 effect 실행

### 4.2 상태 업데이트

상태 업데이트 흐름은 다음과 같다.

1. `setState` 호출
2. Hook 슬롯 값 갱신
3. update 예약 또는 즉시 실행
4. `hookCursor` 초기화
5. 루트 `renderFn` 재실행
6. Component Resolver가 자식 stateless component를 전개
7. 이전 VDOM과 새 VDOM diff
8. patch 적용
9. 필요한 cleanup 수행
10. 새 effect 실행

### 4.3 memo 재사용

`useMemo`는 렌더 중 계산되지만, dependency가 같으면 이전 슬롯의 값을 그대로 사용한다.
이때 VDOM 자체를 저장하는 것이 아니라 파생 계산값을 저장하는 데 사용한다.

## 5. 상태 소유권 규칙

v3는 실제 React처럼 각 컴포넌트가 독립 상태를 갖는 구조를 채택하지 않는다.
대신 아래 규칙을 강제한다.

- 모든 상태는 루트에만 존재한다.
- 자식은 상태를 만들거나 저장하지 않는다.
- 자식은 `props`를 받아 VDOM을 반환하는 pure rendering function이다.
- 여러 자식이 공유해야 하는 값은 루트에서 계산 후 props로 전달한다.

이 규칙은 과제의 `Lifting State Up` 의도를 구현 수준에서 강제하기 위한 것이다.

## 6. unmount 규칙

루트 `FunctionComponent`는 종료 시 다음 순서를 따라야 한다.

1. 등록된 effect cleanup 실행
2. Hook dispatcher 해제
3. 내부 상태를 unmounted 상태로 전환
4. 필요 시 root DOM 비우기

`unmount`는 선택 기능이 아니라 effect lifecycle 완결을 위한 필수 계약이다.

## 7. Hook 사용 규칙

Hook Runtime은 다음 규칙을 전제로 설계한다.

- Hook은 루트 렌더 함수 본문에서만 호출한다.
- 조건문 내부 Hook 호출은 지원하지 않는다.
- 반복문 내부 Hook 호출은 지원하지 않는다.
- 자식 컴포넌트 내부 Hook 호출은 지원하지 않는다.
- Hook 수와 호출 순서는 렌더마다 같아야 한다.

위 규칙을 위반하면 명시적 오류를 던져야 한다.

## 8. update scheduling

기본 전략은 단순하고 설명 가능한 업데이트 모델이다.

- 기본 구현은 즉시 update를 허용한다.
- 확장 구현은 microtask 기반 batching을 둘 수 있다.
- 같은 tick 안에서 여러 `setState`가 호출되면 마지막 예약된 한 번의 update로 합칠 수 있다.

batching은 권장 기능이지만, 구현하더라도 Hook 규칙과 effect 순서를 깨뜨리면 안 된다.

## 9. 기존 코드와의 연결

v3는 기존 저장소의 학습 자산을 최대한 활용한다.

- `src/core/vnode`: 선언형 VDOM 생성
- `src/core/reconciler`: diff 계산
- `src/core/renderer-dom`: DOM 생성 및 patch
- `src/core/engine`: low-level facade와 inspect/history 자산 재사용 후보

다만 `engine`은 현재 일반 VDOM 엔진 중심이므로, v3에서는 그 위에 `FunctionComponent`와 Hook Runtime을 얹는 방향을 우선한다.

v3 구현 완료 시 공개 API는 `src/index.js`에서 노출하고, 브라우저 데모는 `src/app/main.js`를 기준 엔트리포인트로 삼는다.

## 10. 권장 파일 구조

구현 시 권장 구조는 다음과 같다.

- `src/core/runtime/FunctionComponent.js`
- `src/core/runtime/currentDispatcher.js`
- `src/core/runtime/assertActiveDispatcher.js`
- `src/core/runtime/assertRootOnlyHookUsage.js`
- `src/core/runtime/resolveComponentTree.js`
- `src/core/runtime/commitEffects.js`
- `src/core/runtime/areHookDepsEqual.js`
- `src/core/runtime/scheduleUpdate.js`
- `src/core/runtime/unmountComponent.js`
- `src/core/runtime/hooks/useState.js`
- `src/core/runtime/hooks/useEffect.js`
- `src/core/runtime/hooks/useMemo.js`
- `src/core/runtime/createApp.js`
- `src/app/main.js`
- `src/app/...`

기존 `src/core/vnode`, `src/core/reconciler`, `src/core/renderer-dom`은 유지하며 확장한다.

## 11. 앱 통합 아키텍처

앱과 라이브러리의 경계는 아래와 같이 고정한다.

- 라이브러리 공개 경계: `src/index.js`
- 데모 앱 진입점: `src/app/main.js`
- 데모 HTML root id: `app`

`src/app/main.js`의 책임은 다음과 같다.

- 문서 준비 상태 확인
- `#app` root 조회
- root 부재 시 명시적 오류 발생
- `createApp()` 호출
- 반환된 앱 인스턴스의 `mount()` 실행
- 필요 시 종료 시점에 `unmount()` 연결

`createApp()`의 책임은 다음과 같다.

- 공개 API 수준 옵션 정규화
- `FunctionComponent` 생성
- 기존 engine/facade와 runtime 연결
- `mount`, `updateProps`, `unmount`, `getComponent` 노출
- 선택 보조 기능으로 `inspect`를 노출할 수 있으며, 기본 구현에서 생략 가능하다.

## 12. 예약 작업과 종료 처리

update scheduling과 unmount는 함께 정의되어야 한다.

- `scheduleUpdate`는 batching 전략에 따라 즉시 또는 microtask로 flush를 예약한다.
- `unmountComponent`는 예약된 flush가 있으면 취소 상태로 전환해야 한다.
- 취소된 flush는 실행되더라도 DOM patch를 수행하면 안 된다.
- commit 전 pending effect는 폐기한다.
- commit 완료된 effect에 대해서만 cleanup을 실행한다.

## 13. 아키텍처 승인 기준

아래 조건이 충족되면 v3 아키텍처가 올바르게 반영된 것으로 본다.

- 루트 전용 `FunctionComponent`가 존재한다.
- Hook 상태가 루트 `hooks` 배열에 저장된다.
- 자식 컴포넌트는 props-only pure function으로 유지된다.
- 자식 컴포넌트 전개를 담당하는 resolver 단계가 존재한다.
- VDOM 생성과 DOM 반영이 분리되어 있다.
- DOM 갱신이 diff/patch 기반으로 수행된다.
- effect 실행이 DOM 반영 뒤 commit 단계에서 처리된다.
- `unmount` 시 cleanup과 루트 정리가 수행된다.
- `src/app/main.js`가 `#app` root를 기준으로 앱을 부트스트랩한다.
