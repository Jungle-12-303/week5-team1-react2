# React 유사 Virtual DOM / Diff / Patch 시스템 API 명세

## 1. 문서 목적

본 문서는 라이브러리의 공개 API와 각 함수의 입력/출력 계약을 정의한다.
구조적 설계 배경은 [architecture.md](./architecture.md)를 따른다.

## 2. 공개 API 원칙

- 기본 공개 진입점은 `createEngine()`이다.
- low-level 함수는 named export로 함께 제공한다.
- 내부 구현 파일 경로는 공개 API로 간주하지 않는다.
- 문서에 없는 내부 필드는 안정 API가 아니다.

## 3. 공개 export 목록

루트 엔트리포인트는 최소 다음 export를 제공한다.

```js
createEngine
h
domToVNode
diff
applyPatches
createHistory
```

## 4. 데이터 타입 개요

### 4.1 VNode

```js
{
  type: "element" | "text",
  tag: string | null,
  key: string | null,
  props: Record<string, any>,
  events: Record<string, Function>,
  children: VNode[],
  text: string | null,
  meta: {
    source: "dom" | "declarative",
    isWhitespaceOnly: boolean,
    path?: number[]
  }
}
```

### 4.2 History

```js
{
  entries: VNode[],
  currentIndex: number,
  maxLength: number | null
}
```

### 4.3 DiffMode

```js
"auto" | "index" | "keyed"
```

- `auto`
  - 기본값
  - key가 있는 형제 노드는 key를 우선 기준으로 비교하고, key가 없는 노드는 위치 기반으로 비교한다.
- `index`
  - 모든 child 비교를 위치 기반으로 수행한다.
- `keyed`
  - 고급 비교/검증용 모드
  - key 중심 비교를 우선 사용해 재정렬과 재사용을 더 적극적으로 표현한다.

## 5. Engine API

### 5.1 `createEngine(options)`

엔진 인스턴스를 생성한다.

```js
const engine = createEngine({
  root,
  initialVNode,
  diffMode: "auto",
  historyLimit: null
});
```

입력:

- `root: Element`
  - 엔진이 관리할 실제 DOM 루트
- `initialVNode: VNode`
  - 초기 상태
- `diffMode?: "auto" | "index" | "keyed"`
  - 기본값은 `"auto"`
- `historyLimit?: number | null`
  - 기본값은 `null`

반환:

- `Engine`

오류:

- `root`가 유효한 Element가 아니면 예외를 던진다.
- `initialVNode`가 canonical vnode shape를 만족하지 않으면 예외를 던진다.

### 5.2 `engine.render(vnode)`

주어진 vnode를 기준으로 엔진 관리 루트를 렌더링하고 현재 상태를 교체한다.
이 메서드는 비이력 동기화용 API다.

입력:

- `vnode: VNode`

반환:

- `vnode`

동작:

- 관리 루트를 새 vnode와 동기화한다.
- 현재 vnode를 새 값으로 교체한다.
- history에 새로운 snapshot을 push 하지 않는다.
- 기존 history와 currentIndex는 유지한다.
- 초기 mount 또는 명시적 비이력 동기화에 사용한다.

### 5.3 `engine.patch(nextVNode)`

현재 vnode와 `nextVNode`를 diff 한 뒤 patch를 적용한다.

입력:

- `nextVNode: VNode`

반환:

```js
{
  patches,
  previousVNode,
  currentVNode
}
```

동작:

- `diff(currentVNode, nextVNode, { mode })`를 호출한다.
- `applyPatches(root, patches, context)`를 호출한다.
- 성공하면 history에 snapshot을 push 한다.

### 5.4 `engine.undo()`

이전 history 상태로 이동한다.

반환:

```js
{
  moved: boolean,
  currentVNode
}
```

동작:

- 이동 가능한 경우 `currentIndex`를 감소시킨다.
- 해당 vnode로 engine이 관리하는 actual DOM 루트를 동기화한다.
- demo의 test panel 동기화는 engine 외부 계층이 `currentVNode`를 사용해 수행한다.

### 5.5 `engine.redo()`

다음 history 상태로 이동한다.

반환:

```js
{
  moved: boolean,
  currentVNode
}
```

동작:

- 이동 가능한 경우 `currentIndex`를 증가시킨다.
- 해당 vnode로 engine이 관리하는 actual DOM 루트를 동기화한다.
- demo의 test panel 동기화는 engine 외부 계층이 `currentVNode`를 사용해 수행한다.

### 5.6 `engine.getCurrentVNode()`

현재 vnode snapshot을 반환한다.

### 5.7 `engine.getHistory()`

현재 history 객체를 반환한다.

반환 객체는 읽기 전용으로 취급해야 한다.

### 5.8 `engine.inspect()`

디버깅 및 demo 시각화를 위한 inspect 데이터를 반환한다.

최소 반환 항목:

```js
{
  currentVNode,
  history,
  diffMode,
  patchCount
}
```

## 6. Low-Level API

### 6.1 `h(tag, props, ...children)`

선언형 vnode를 생성한다.

```js
const vnode = h("button", { key: "save", onClick: handleClick }, "Save");
```

입력:

- `tag: string`
- `props?: object | null`
- `children: any[]`

반환:

- `VNode`

정규화 규칙:

- `key`는 최상위 필드로 승격한다.
- `onXxx` 이벤트 prop은 `events.xxx`로 변환한다.
- string, number child는 text vnode로 변환한다.
- 배열 child는 flatten 한다.
- `null`, `undefined`, `false`, `true`는 렌더링 대상에서 제외한다.

### 6.2 `domToVNode(domNode, options = {})`

DOM 노드를 canonical vnode로 변환한다.

```js
const vnode = domToVNode(rootNode, {
  preserveWhitespace: false
});
```

입력:

- `domNode: Node`
- `options.preserveWhitespace?: boolean`

반환:

- `VNode`

제약:

- DOM에 이미 연결된 이벤트 리스너는 복원하지 않는다.

### 6.3 `diff(oldVNode, newVNode, options = {})`

두 vnode를 비교하여 flat patch list를 생성한다.

```js
const patches = diff(oldVNode, newVNode, {
  mode: "auto"
});
```

입력:

- `oldVNode: VNode`
- `newVNode: VNode`
- `options.mode?: "auto" | "index" | "keyed"`

반환:

- `Patch[]`

보장:

- 반환값은 항상 배열이다.
- 변경이 없으면 빈 배열을 반환한다.

### 6.4 `applyPatches(rootDom, patches, context = {})`

patch list를 실제 DOM에 적용한다.

```js
applyPatches(rootDom, patches, {
  getCurrentVNode: () => currentVNode
});
```

입력:

- `rootDom: Element`
- `patches: Patch[]`
- `context?: object`

반환:

```js
{
  appliedCount: number
}
```

오류:

- path가 유효하지 않아 patch 대상을 찾을 수 없으면 예외를 던져야 한다.
- 지원하지 않는 patch type이 들어오면 예외를 던져야 한다.
- patch 적용 도중 실패가 발생하면 조용히 무시하지 않고 예외를 상위 호출자에 전달해야 한다.

### 6.5 `createHistory(initialVNode, options = {})`

history 객체를 생성한다.

```js
const history = createHistory(initialVNode, {
  maxLength: 20
});
```

입력:

- `initialVNode: VNode`
- `options.maxLength?: number | null`

반환:

- `History`

동작:

- `entries`는 초기 vnode 하나를 가진다.
- `currentIndex`는 `0`이다.

## 7. Patch 타입

공개적으로 관찰 가능한 patch 타입은 다음과 같다.

```js
"SET_PROP"
"REMOVE_PROP"
"SET_TEXT"
"INSERT_CHILD"
"REMOVE_CHILD"
"MOVE_CHILD"
"REPLACE_NODE"
"SET_EVENT"
"REMOVE_EVENT"
```

각 patch는 최소 `type`과 `path`를 가진다.
추가 필드는 타입별로 다르다.

## 8. 오류 처리 원칙

- 잘못된 입력 타입은 즉시 예외를 던진다.
- 잘못된 HTML 문자열은 core API가 아니라 demo sanitize 단계에서 처리한다.
- patch 적용 실패는 조용히 무시하지 않는다.
- undo/redo 불가 상태는 예외 대신 `moved: false`로 표현할 수 있다.

## 9. 안정성 범위

다음 항목은 안정 API에 포함된다.

- `createEngine`
- `h`
- `domToVNode`
- `diff`
- `applyPatches`
- `createHistory`
- `engine.render`
- `engine.patch`
- `engine.undo`
- `engine.redo`
- `engine.getCurrentVNode`
- `engine.getHistory`
- `engine.inspect`

다음 항목은 안정 API에 포함되지 않는다.

- 내부 디렉터리 구조
- 내부 유틸 함수
- demo 전용 함수
- inspect 결과의 선택 필드

## 10. 예시 사용 흐름

```js
import { createEngine, h } from "<package-root>";

const initialVNode = h("div", { id: "app" },
  h("h1", null, "Hello"),
  h("button", { onClick: () => console.log("click") }, "Push")
);

const engine = createEngine({
  root: document.getElementById("app"),
  initialVNode,
  diffMode: "auto"
});

engine.render(initialVNode);

engine.patch(
  h("div", { id: "app" },
    h("h1", null, "Hello world"),
    h("button", { onClick: () => console.log("next") }, "Push")
  )
);
```
