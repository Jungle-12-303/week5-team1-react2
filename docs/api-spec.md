# Week5 v3 API 명세서

## 1. 문서 목적

본 문서는 week5 v3 구현에서 외부와 내부가 공유하는 핵심 API 계약을 정의한다.
실제 React 공개 API와의 1:1 호환이 목적은 아니며, 과제 요구를 가장 잘 수행하는 최소-확장형 API를 목표로 한다.

## 2. 공개 API 개요

v3의 핵심 API는 아래 다섯 축으로 구성한다.

- `FunctionComponent`
- `createApp`
- `h`
- `useState`
- `useEffect`
- `useMemo`

v3의 문서 기준 공개 엔트리포인트는 `src/index.js`다.
아래에 명시된 API는 구현 완료 시 이 파일에서 export 되어야 한다.

## 3. FunctionComponent

### 3.1 개요

`FunctionComponent`는 루트 함수형 컴포넌트를 감싸는 런타임 클래스다.
Hook 저장소와 렌더 사이클 제어는 모두 이 클래스가 담당한다.

### 3.2 생성자

```js
new FunctionComponent(renderFn, options?)
```

#### 입력

- `renderFn: (props) => VNode`
- `options?: { name?: string, batching?: "sync" | "microtask" }`

#### 보장

- 인스턴스는 `hooks` 배열을 가진다.
- 인스턴스는 `mount()`, `update()`, `unmount()` 메서드를 가진다.
- 인스턴스는 현재 `props`, 현재 `VNode`, mount 여부를 추적한다.

### 3.3 필수 속성

구현체는 최소한 아래 속성을 내부적으로 유지해야 한다.

- `hooks`
- `hookCursor`
- `currentProps`
- `currentVNode`
- `rootElement`
- `isMounted`

### 3.4 unmount

```js
component.unmount()
```

#### 동작

- 등록된 effect cleanup을 모두 실행한다.
- 루트 DOM을 정리한다.
- Hook dispatcher와 내부 참조를 해제한다.
- 이후 같은 인스턴스에서 Hook update가 다시 일어나지 않도록 막는다.

#### 반환

- `void`

### 3.5 mount

```js
component.mount({ root, props? })
```

#### 입력

- `root: Element`
- `props?: object`

#### 동작

- 루트 DOM 컨테이너를 저장한다.
- 루트 렌더를 최초 1회 수행한다.
- 생성된 VDOM을 DOM으로 변환해 mount한다.
- mount 이후 필요한 effect를 commit 단계에서 실행한다.

#### 반환

- 현재 렌더된 `VNode`

### 3.6 update

```js
component.update(nextProps?)
```

#### 입력

- `nextProps?: object`

#### 동작

- `nextProps`가 주어지면 기존 props를 완전 교체한다.
- `hookCursor`를 0으로 초기화한다.
- 루트 렌더 함수를 다시 실행한다.
- 이전 VDOM과 다음 VDOM을 diff 한다.
- patch를 DOM에 반영한다.
- 이전 effect cleanup과 새 effect commit을 처리한다.

#### 반환

- `{ vnode, patches }`

## 4. createApp

### 4.1 목적

`createApp`은 데모 앱에서 사용할 간단한 진입점이다.
내부적으로 `FunctionComponent`와 기존 engine 계층을 연결한다.

### 4.2 시그니처

```js
createApp(options)
```

```js
createApp({
  root,
  component,
  props = {},
  batching = "sync",
  diffMode = "auto",
  historyLimit = null,
})
```

### 4.3 입력

- `root: Element`
- `component: (props) => VNode`
- `props?: object`
- `batching?: "sync" | "microtask"`
- `diffMode?: "auto" | "keyed" | "index"`
- `historyLimit?: number | null`

#### 옵션 분류

- 필수: `root`, `component`
- 일반 선택: `props`, `batching`
- 개발용 선택: `diffMode`, `historyLimit`

### 4.4 반환

```js
{
  mount,
  unmount,
  updateProps,
  getComponent,
  inspect?,
}
```

#### 메서드 설명

- `mount()`: 최초 mount 수행
- `unmount()`: cleanup 실행 후 루트 종료
- `updateProps(nextProps)`: 외부 props를 완전 교체한 뒤 재렌더
- `inspect()`: 선택 보조 기능. 구현 시 현재 상태, VNode, 마지막 patch 같은 개발용 정보 반환. 기본 구현에서 생략 가능하다.
- `getComponent()`: 내부 `FunctionComponent` 인스턴스 반환

### 4.5 통합 규칙

- 앱은 `createApp()`을 `src/index.js`를 통해 사용해야 한다.
- 앱은 내부 `src/core/...` 경로를 직접 import 하면 안 된다.
- `root`가 유효한 `Element`가 아니면 명시적 오류를 발생시켜야 한다.
- `unmount()` 이후 `mount()`를 다시 허용할지 여부는 구현에서 명시적으로 정해야 하며, 기본 권장 정책은 같은 인스턴스 재사용 금지다.

## 5. h

### 5.1 목적

`h`는 선언형 VNode 생성 함수다.
기존 `src/core/vnode/h.js`를 재사용하거나 그 계약을 따른다.

### 5.2 시그니처

```js
h(type, props, ...children)
```

### 5.3 입력 규칙

- `type`: 문자열 태그 또는 자식 stateless component 함수
- `props`: 일반 속성, 이벤트, `key`를 포함할 수 있다.
- `children`: 문자열, 숫자, VNode, 배열, nullish 값의 조합

### 5.4 동작 규칙

- `key`는 일반 props와 분리해 저장한다.
- `onClick`, `onInput` 등 함수형 이벤트 prop은 이벤트 맵으로 분리할 수 있다.
- 배열 children은 평탄화하고 정규화한다.
- `null`, `undefined`, `false`는 렌더 가능한 빈 자식으로 취급한다.
- 자식 함수형 컴포넌트는 Hook을 사용하지 않는 pure function이어야 한다.
- 자식 함수형 컴포넌트는 resolver 단계에서 즉시 호출되어 일반 VNode로 전개된다.

## 6. useState

### 6.1 시그니처

```js
const [state, setState] = useState(initialState)
```

### 6.2 입력

- `initialState: any | (() => any)`

### 6.3 보장

- 최초 렌더에서만 초기값을 계산한다.
- 이후 렌더에서는 기존 슬롯 값을 재사용한다.
- `setState(next)`는 값 또는 updater function을 받을 수 있다.
- 상태 변경 후 루트 update가 수행된다.
- `unmount` 이후 호출된 setter는 no-op이며, 새로운 렌더나 DOM patch를 발생시키지 않는다.

### 6.4 제약

- 루트 `FunctionComponent`의 렌더 중에만 호출할 수 있다.
- 자식 컴포넌트 내부에서는 호출할 수 없다.
- Hook 순서가 바뀌면 오류를 발생시켜야 한다.
- 활성 dispatcher가 없으면 오류를 발생시켜야 한다.

## 7. useEffect

### 7.1 시그니처

```js
useEffect(create, deps?)
```

### 7.2 입력

- `create: () => void | (() => void)`
- `deps?: any[]`

### 7.3 동작

- effect 본문은 DOM patch 완료 후 실행한다.
- `deps`가 없으면 매 update마다 실행한다.
- `deps`가 빈 배열이면 mount 후 한 번만 실행한다.
- `deps`가 있으면 shallow compare 결과가 달라질 때만 실행한다.
- 이전 cleanup이 있으면 새 effect 전에 cleanup을 먼저 실행한다.
- unmount 시 cleanup을 실행한다.

## 8. useMemo

### 8.1 시그니처

```js
const value = useMemo(factory, deps)
```

### 8.2 입력

- `factory: () => any`
- `deps: any[]`

### 8.3 동작

- 최초 렌더 시 값을 계산한다.
- 이후 dependency가 같으면 이전 값을 반환한다.
- dependency가 바뀌면 다시 계산한다.

## 9. Hook 사용 규칙

모든 Hook은 아래 규칙을 따른다.

- 루트 컴포넌트 본문에서만 호출한다.
- 조건문 내부에서 호출하지 않는다.
- 반복문 내부에서 호출하지 않는다.
- 이벤트 핸들러 내부에서 직접 호출하지 않는다.
- 호출 순서는 모든 렌더에서 동일해야 한다.

규칙 위반 시 구현은 명시적 오류를 발생시켜야 한다.

## 10. 자식 컴포넌트 계약

자식 컴포넌트는 아래 계약을 따른다.

```js
function Child(props) {
  return h("div", null, props.label);
}
```

- 자식은 순수 함수다.
- 자식은 `props`만 입력으로 받는다.
- 자식은 Hook과 상태를 사용하지 않는다.
- 자식은 부수 효과를 직접 수행하지 않는다.

## 11. 이벤트 계약

v3는 브라우저 데모에 필요한 일반 DOM 이벤트를 지원해야 한다.

- `onClick`
- `onInput`
- `onChange`
- `onSubmit`
- `onKeydown`
- `onFocus`
- `onBlur`

구현은 기존 renderer-dom 이벤트 계층을 재사용하거나 동일 계약을 만족해야 한다.
위 목록은 v3 기본 보장 범위이며, 그 밖의 이벤트는 구현 확장 범위로 본다.

## 12. 폼 요소 계약

v3는 일반적인 데모 애플리케이션에 필요한 최소 form semantics를 보장해야 한다.

- text input의 `value`
- checkbox input의 `checked`
- textarea의 `value`
- select의 `value`
- `onInput`과 `onChange`를 통한 상태 반영

위 범위는 v3 기본 보장 범위이며, 그 밖의 고급 form semantics는 기본 보장 범위가 아니다.

## 13. 자식 컴포넌트 전개 계약

구현은 자식 함수형 컴포넌트를 위한 전개 단계를 가져야 한다.

```js
resolveComponentTree(inputVNode) => resolvedVNode
```

이 단계는 아래를 보장해야 한다.

- 함수형 자식 컴포넌트를 감지한다.
- `props`를 주입해 함수를 실행한다.
- 반환값을 일반 VNode 구조로 정규화한다.
- 자식에서 Hook 사용이 감지되면 명시적 오류를 발생시켜야 한다.

## 14. inspect 계약

개발과 발표 편의를 위해 구현은 아래 inspect 정보를 제공하는 것을 권장한다.

```js
inspect() => {
  hooks,
  currentVNode,
  lastPatches,
  renderCount,
}
```

이는 필수 외부 API가 아니라 권장 보조 기능이며, 구현 시 `createApp().inspect()` 형태로 제공하는 것을 권장한다. 기본 구현에서 생략 가능하다.

## 15. 브라우저 부트스트랩 계약

브라우저 데모 앱은 아래 계약을 따른다.

```js
import { createApp } from "../index.js";
```

- 엔트리 파일은 `src/app/main.js`다.
- HTML 셸 파일은 `index.html`이다.
- 기본 root selector는 `#app`이다.
- `document.getElementById("app")`가 `null`이면 명시적 오류를 발생시켜야 한다.
- 문서가 이미 로드된 상태면 즉시 mount 한다.
- 아니라면 `DOMContentLoaded` 이후 mount 한다.

## 16. 비범위 API

다음 React 계열 API는 v3에서 제공하지 않는다.

- `useReducer`
- `useContext`
- `useRef`
- `useCallback`
- `memo`
- `forwardRef`
- `createContext`
- `createPortal`
- `hydrateRoot`
- `renderToString`

## 17. 예시

```js
import { createApp, h, useEffect, useMemo, useState } from "./src/index.js";

function CounterView(props) {
  return h("button", { onClick: props.onIncrement }, `count: ${props.count}`);
}

function App() {
  const [count, setCount] = useState(0);

  const doubled = useMemo(() => count * 2, [count]);

  useEffect(() => {
    document.title = `count: ${count}`;
    return () => {
      document.title = "cleanup";
    };
  }, [count]);

  return h("section", null,
    h("h1", null, "Week5 React-like"),
    h(CounterView, {
      count,
      onIncrement: () => setCount((prev) => prev + 1),
    }),
    h("p", null, `doubled: ${doubled}`)
  );
}

createApp({
  root: document.getElementById("app"),
  component: App,
}).mount();
```
