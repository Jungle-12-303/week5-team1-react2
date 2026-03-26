# React 유사 Virtual DOM 시스템의 Diff 알고리즘 설명서

## 1. 문서 목적

본 문서는 현재 설계된 Virtual DOM 엔진의 Diff 알고리즘이 무엇을 하는지, 왜 필요한지, 실제로 어떤 순서로 동작하는지를 설명하기 위한 학습/발표용 문서다.

이 문서는 시연 중 아래와 같은 질문에 답할 수 있도록 돕는다.

- Diff 알고리즘이 왜 필요한가
- 이전 상태와 현재 상태를 어떻게 비교하는가
- 어떤 경우에 `REPLACE_NODE`가 나오고 어떤 경우에 `MOVE_CHILD`가 나오는가
- 왜 기본 철학을 key-aware로 설계했는가
- 현재 구현이 React와 비슷한 점과 다른 점은 무엇인가

본 문서는 설명 문서이며, 공식 요구사항과 계약은 `requirements.md`, `architecture.md`, `api-spec.md`를 따른다.

## 2. Diff 알고리즘이 필요한 이유

브라우저의 실제 DOM은 조작 비용이 비싸다.
노드 생성, 삭제, 속성 반영, 레이아웃 계산, 페인트 같은 작업은 브라우저가 실제 화면을 업데이트해야 하기 때문이다.

만약 상태가 바뀔 때마다 전체 DOM을 다시 만들면 구현은 단순하지만 비효율적이다.
Virtual DOM 시스템은 이를 피하기 위해 다음 흐름을 사용한다.

1. 이전 UI 상태를 VNode 트리로 보관한다.
2. 현재 UI 상태도 VNode 트리로 만든다.
3. 두 트리를 비교해 바뀐 부분만 계산한다.
4. 실제 DOM에는 그 변경점만 반영한다.

여기서 3번 역할을 담당하는 것이 Diff 알고리즘이다.

## 3. 현재 시스템에서 Diff의 입력과 출력

### 3.1 입력

Diff의 입력은 다음 두 개다.

- `oldVNode`
- `newVNode`

둘 다 같은 canonical shape를 가진다.

```js
{
  type: "element" | "text",
  tag: "div" | null,
  key: "item-1" | null,
  props: {},
  events: {},
  children: [],
  text: null
}
```

즉, Diff는 실제 DOM을 직접 비교하지 않는다.
항상 정규화된 VNode끼리 비교한다.

### 3.2 출력

출력은 flat patch list다.

```js
[
  { type: "SET_PROP", path: [0], name: "className", value: "active" },
  { type: "SET_TEXT", path: [1, 0], value: "updated" }
]
```

이 patch list는 “어디를 어떻게 바꾸면 되는가”를 표현하는 변경 명령 목록이다.

## 4. Diff의 핵심 목표

현재 시스템의 Diff 알고리즘은 다음 목표를 가진다.

1. 전체 재렌더링이 아니라 변경점 탐지를 수행한다.
2. 가능한 한 기존 DOM 노드를 재사용한다.
3. 사람이 읽고 설명할 수 있는 patch를 생성한다.
4. key가 있는 경우 같은 노드를 더 정확히 식별한다.
5. patch 단계가 DOM에 바로 적용할 수 있는 결과를 만든다.

## 5. 현재 시스템의 기본 철학: key-aware(auto)

현재 설계의 기본 모드는 `auto`다.

`auto` 모드는 다음 규칙을 따른다.

- 형제 노드 집합에 key가 있으면 key를 우선 기준으로 비교한다.
- key가 없으면 위치 기반으로 비교한다.

이 설계는 React와 유사한 방향을 목표로 한다.
즉, key는 단순한 옵션이 아니라 sibling 집합에서 노드 identity를 표현하는 핵심 정보다.

현재 시스템은 비교/학습용으로 아래 모드도 별도 지원한다.

- `index`
  - 모든 child를 위치 기준으로 비교
- `keyed`
  - key 중심 비교를 더 명시적으로 검증하기 위한 모드

## 6. Diff 알고리즘의 전체 흐름

Diff는 보통 루트 노드부터 시작해 재귀적으로 내려간다.
가장 바깥 노드에서 “같은 노드로 볼 수 있는가”를 판단하고, 같다고 볼 수 있을 때만 내부를 더 세밀하게 비교한다.

큰 흐름은 다음과 같다.

1. 노드 존재 여부 비교
2. 노드 타입 비교
3. 태그 비교
4. props 비교
5. events 비교
6. text 비교
7. children 비교
8. patch list 누적 반환

## 7. 단계별 동작 설명

### 7.1 노드 존재 여부 비교

가장 먼저 old와 new가 각각 존재하는지 본다.

경우는 세 가지다.

1. old는 없고 new는 있다
   - 새로운 노드가 추가된 것이다.
   - 부모 child 비교 맥락에서는 보통 `INSERT_CHILD`가 필요하다.
   - 루트 비교처럼 부모 맥락이 없으면 `REPLACE_NODE`로 표현할 수 있다.

2. old는 있고 new는 없다
   - 기존 노드가 제거된 것이다.
   - 보통 `REMOVE_CHILD`가 필요하다.

3. 둘 다 있다
   - 다음 단계로 내려간다.

이 단계는 트리 비교의 입구다.
존재 여부가 다르면 내부를 더 비교할 이유가 거의 없다.

### 7.2 노드 타입 비교

둘 다 존재하더라도 `type`이 다를 수 있다.

예:

- old: element node
- new: text node

이 경우는 같은 노드라고 보기 어렵다.
노드의 표현 방식 자체가 바뀌었기 때문에 보통 `REPLACE_NODE`가 가장 자연스럽다.

```js
old: { type: "element", tag: "span", ... }
new: { type: "text", text: "hello" }

=> [{ type: "REPLACE_NODE", path: [...], node: new }]
```

### 7.3 태그 비교

둘 다 element node라면 다음으로 `tag`를 본다.

예:

- old: `<div>`
- new: `<section>`

태그가 다르면 DOM 노드의 종류가 바뀌는 것이므로, 내부를 세밀하게 비교하기보다 `REPLACE_NODE`로 처리하는 편이 낫다.

이 단계는 “기존 DOM을 재사용할 수 있는가”를 판단하는 중요한 분기다.

### 7.4 props 비교

`type`과 `tag`가 같다면 이제 같은 종류의 노드로 보고 세부 속성을 비교한다.

props 비교에서 보는 것은 다음과 같다.

- old에 없고 new에 있는 속성
  - `SET_PROP`
- old에 있고 new에 없는 속성
  - `REMOVE_PROP`
- 둘 다 있는데 값이 다른 속성
  - `SET_PROP`

예:

```js
old.props = { className: "box", title: "old" }
new.props = { className: "box active" }
```

결과:

```js
[
  { type: "SET_PROP", path: [0], name: "className", value: "box active" },
  { type: "REMOVE_PROP", path: [0], name: "title" }
]
```

### 7.5 events 비교

현재 시스템은 이벤트도 별도 비교 대상이다.
이벤트는 `events` 필드에 정규화되어 들어온다.

비교 규칙은 props와 비슷하다.

- old에 없고 new에 있는 이벤트
  - `SET_EVENT`
- old에 있고 new에 없는 이벤트
  - `REMOVE_EVENT`
- 둘 다 있지만 핸들러가 다른 이벤트
  - 보통 `SET_EVENT` 또는 `REMOVE_EVENT + SET_EVENT`

예:

```js
old.events = { click: oldHandler }
new.events = { click: newHandler }
```

결과:

```js
[
  { type: "SET_EVENT", path: [0], name: "click", handler: newHandler }
]
```

### 7.6 text 비교

둘 다 text node라면 비교는 단순하다.
문자열이 같으면 patch가 없고, 다르면 `SET_TEXT`를 만든다.

예:

```js
old.text = "hello"
new.text = "hello world"
```

결과:

```js
[
  { type: "SET_TEXT", path: [1, 0], value: "hello world" }
]
```

### 7.7 children 비교

children 비교가 Diff 알고리즘의 핵심이다.
리스트, 재정렬, 추가/삭제가 모두 여기서 처리된다.

현재 시스템은 세 가지 관점으로 children을 비교할 수 있다.

- `auto`
- `index`
- `keyed`

## 8. children 비교 방식

### 8.1 `index` 모드

가장 단순한 방식이다.
같은 인덱스의 child끼리 같은 노드라고 가정한다.

예:

```js
old: [A, B, C]
new: [A, X, C, D]
```

비교 흐름:

- `0`: A vs A
- `1`: B vs X
- `2`: C vs C
- `3`: 없음 vs D

장점:

- 구현이 단순하다.
- 발표 시 설명이 쉽다.

단점:

- 재정렬에 약하다.
- `[A, B, C] -> [C, A, B]` 같은 경우 실제로는 이동인데, index 모드는 여러 노드가 바뀐 것으로 해석하기 쉽다.

### 8.2 `keyed` 모드

key가 있는 child는 key를 기준으로 같은 노드인지 판단한다.

예:

```js
old: [
  { key: "a", ... },
  { key: "b", ... },
  { key: "c", ... }
]

new: [
  { key: "c", ... },
  { key: "a", ... },
  { key: "b", ... }
]
```

이 경우 keyed 비교는 다음처럼 본다.

- `c`는 같은 노드인데 위치만 바뀌었다.
- `a`도 같은 노드다.
- `b`도 같은 노드다.

따라서 재정렬은 `MOVE_CHILD` 중심으로 표현할 수 있다.

장점:

- 재정렬을 더 정확히 표현한다.
- 같은 logical item을 더 잘 재사용한다.

단점:

- 구현이 더 복잡하다.
- key 정책이 불안정하면 오히려 혼란을 만든다.

### 8.3 `auto` 모드

현재 시스템의 기본 모드다.

동작 방식:

- key가 있는 형제 집합은 key 중심으로 비교
- key가 없는 형제 집합은 위치 기반으로 비교

즉, `auto`는 `keyed`와 `index`를 상황에 따라 결합한 모드다.
실제 사용성과 React 유사성을 고려하면 가장 자연스러운 기본값이다.

## 9. key-aware 비교가 중요한 이유

key-aware 비교가 없으면 리스트 재정렬 시 같은 데이터 항목도 다른 항목으로 오해할 수 있다.

예를 들어 todo 목록이 있다고 가정하자.

```js
old: [todoA, todoB, todoC]
new: [todoC, todoA, todoB]
```

index만 보면:

- 첫 번째 항목이 A에서 C로 바뀜
- 두 번째 항목이 B에서 A로 바뀜
- 세 번째 항목이 C에서 B로 바뀜

처럼 보인다.

하지만 key-aware 비교를 하면:

- C가 앞으로 이동
- A가 두 번째로 이동
- B가 세 번째로 이동

으로 해석된다.

이 차이는 다음에 직접 영향을 준다.

- DOM 재사용
- 이벤트 연결 유지
- 입력값이나 내부 상태의 해석
- 발표에서 “왜 key가 필요한가” 설명하는 방식

## 10. patch의 `path`는 왜 필요한가

patch에는 `path`가 포함된다.
이 값은 트리 안에서 어떤 노드를 수정할지를 가리키는 주소다.

예:

```html
<div>
  <ul>
    <li>A</li>
    <li>B</li>
  </ul>
</div>
```

여기서 두 번째 `li`의 텍스트를 바꾸면 patch는 대략 다음처럼 된다.

```js
{ type: "SET_TEXT", path: [0, 1, 0], value: "B2" }
```

의미:

- `[0]`
  - 루트의 첫 번째 child
- `[0, 1]`
  - 그 child의 두 번째 child
- `[0, 1, 0]`
  - 그 내부 text node

patch 단계는 이 `path`를 따라 실제 DOM 노드를 찾고 변경을 적용한다.

## 11. 5가지 핵심 diff 케이스

현재 요구사항이 최소한 지원해야 하는 핵심 케이스는 다음 다섯 가지다.

### 11.1 노드 추가

old에 없고 new에 있는 경우다.

예:

```js
old: <ul><li>A</li></ul>
new: <ul><li>A</li><li>B</li></ul>
```

결과:

```js
[{ type: "INSERT_CHILD", path: [0], index: 1, node: liB }]
```

### 11.2 노드 삭제

old에는 있었지만 new에는 없는 경우다.

결과:

```js
[{ type: "REMOVE_CHILD", path: [0], index: 1 }]
```

### 11.3 노드 타입 변경

text node가 element node로 바뀌거나 그 반대인 경우다.

결과:

```js
[{ type: "REPLACE_NODE", path: [0], node: newNode }]
```

### 11.4 태그 변경

둘 다 element node지만 `div -> p`처럼 tag가 달라진 경우다.

결과:

```js
[{ type: "REPLACE_NODE", path: [0], node: newNode }]
```

### 11.5 속성/텍스트/자식 변경

같은 노드라고 볼 수 있는 경우 내부 속성, text, child만 달라질 수 있다.

결과:

- `SET_PROP`
- `REMOVE_PROP`
- `SET_TEXT`
- `INSERT_CHILD`
- `REMOVE_CHILD`
- `MOVE_CHILD`

등의 조합으로 표현된다.

## 12. 예제: 실제로 어떻게 patch가 만들어지는가

### 예제 1. props와 text 변경

old:

```js
h("div", { className: "box" },
  h("span", null, "Hello")
)
```

new:

```js
h("div", { className: "box active" },
  h("span", null, "Hello world")
)
```

예상 patch:

```js
[
  { type: "SET_PROP", path: [], name: "className", value: "box active" },
  { type: "SET_TEXT", path: [0, 0], value: "Hello world" }
]
```

### 예제 2. key-aware 재정렬

old:

```js
[
  h("li", { key: "a" }, "A"),
  h("li", { key: "b" }, "B"),
  h("li", { key: "c" }, "C")
]
```

new:

```js
[
  h("li", { key: "c" }, "C"),
  h("li", { key: "a" }, "A"),
  h("li", { key: "b" }, "B")
]
```

가능한 patch:

```js
[
  { type: "MOVE_CHILD", path: [], fromIndex: 2, toIndex: 0, key: "c" }
]
```

### 예제 3. index-only 비교에서의 재정렬

같은 예제를 `index` 모드로 보면 이동이 아니라 교체나 remove/insert 조합으로 보일 수 있다.

가능한 해석:

```js
[
  { type: "REMOVE_CHILD", path: [], index: 2 },
  { type: "INSERT_CHILD", path: [], index: 0, node: keyedC }
]
```

또는 각 인덱스별 내부 변경으로 분해될 수도 있다.

이 예제가 바로 발표 때 `auto`와 `index` 차이를 보여주기 좋은 이유다.

## 13. 간단한 의사 코드

아래는 현재 설계를 설명하기 위한 단순화된 의사 코드다.

```js
function diff(oldVNode, newVNode, path = [], mode = "auto") {
  if (!oldVNode && newVNode) {
    // 루트 수준 비교에서는 삽입 대상 부모가 없으므로 교체로 표현할 수 있다.
    return [{ type: "REPLACE_NODE", path, node: newVNode }];
  }

  if (oldVNode && !newVNode) {
    // child 비교에서는 부모 path와 index를 사용해 제거를 표현한다.
    return [{ type: "REMOVE_CHILD", path: path.slice(0, -1), index: path[path.length - 1] }];
  }

  if (oldVNode.type !== newVNode.type) {
    return [{ type: "REPLACE_NODE", path, node: newVNode }];
  }

  if (oldVNode.type === "text") {
    if (oldVNode.text !== newVNode.text) {
      return [{ type: "SET_TEXT", path, value: newVNode.text }];
    }
    return [];
  }

  if (oldVNode.tag !== newVNode.tag) {
    return [{ type: "REPLACE_NODE", path, node: newVNode }];
  }

  const patches = [];

  patches.push(...diffProps(oldVNode.props, newVNode.props, path));
  patches.push(...diffEvents(oldVNode.events, newVNode.events, path));
  patches.push(...diffChildren(oldVNode.children, newVNode.children, path, mode));

  return patches;
}
```

실제 구현에서는 `diffChildren()`이 가장 중요하다.
여기서 `auto`, `index`, `keyed` 모드를 분기하며, 부모/자식 맥락에 따라 `INSERT_CHILD`와 `MOVE_CHILD`를 생성한다.

## 14. 발표 때 설명하기 좋은 포인트

### 14.1 한 줄 요약

- VNode는 UI의 스냅샷이다.
- Diff는 이전 스냅샷과 현재 스냅샷의 차이를 계산한다.
- Patch는 그 차이를 실제 DOM에 적용한다.

### 14.2 “최소 변경”이란 무엇인가

최소 변경은 “DOM 전체를 다시 그리지 않고, 필요한 속성/텍스트/자식 변경만 적용하는 것”이다.

다만 최소 변경은 항상 절대적으로 가장 적은 patch 수를 의미하는 것은 아니다.
현재 시스템에서는 다음 균형을 목표로 한다.

- 설명 가능성
- 일관된 patch shape
- 기존 DOM 재사용
- key 기반 identity 보존

### 14.3 왜 key가 중요한가

key는 같은 리스트 항목을 시간에 따라 연결해 주는 identity다.
key가 있으면 재정렬을 “같은 노드의 이동”으로 설명할 수 있다.
key가 없으면 위치 기반 비교로 fallback 한다.

### 14.4 왜 기본 모드를 auto로 두었는가

단순한 index-only 비교는 학습용으로는 좋지만 React 유사성이 낮다.
반면 key-aware 기본 모드는 실제 리스트 재정렬과 DOM 재사용을 더 자연스럽게 설명할 수 있다.

## 15. 현재 구현이 React와 비슷한 점과 다른 점

### 비슷한 점

- 트리 기반 UI 표현을 사용한다.
- 이전/현재 트리를 비교해 변경점을 계산한다.
- key를 노드 identity 판단에 활용한다.
- 부분 patch를 통해 전체 재렌더링을 피하려고 한다.

### 다른 점

- React의 실제 reconciliation은 훨씬 더 복잡하다.
- Fiber, scheduler, concurrent rendering 같은 구조는 포함하지 않는다.
- hooks, component lifecycle, update queue는 1차 범위에 포함하지 않는다.
- 현재 시스템은 설명 가능한 patch list를 우선시한다.

## 16. 현재 구현의 한계

현재 설계의 한계는 다음과 같다.

- 모든 경우에서 최적 patch를 보장하지는 않는다.
- key가 없는 리스트 재정렬은 위치 기반 fallback이라서 오차가 생길 수 있다.
- DOM에서 이미 바인딩된 이벤트를 역추적하지 않는다.
- React 내부 최적화 수준의 성능을 목표로 하지는 않는다.

이 한계는 결함이라기보다, 최소 구현과 설명 가능성을 우선한 결과다.

## 17. 예상 질문과 짧은 답변 예시

### Q1. 왜 Diff가 필요한가

A. 상태가 바뀔 때마다 DOM 전체를 다시 만들지 않고, 바뀐 부분만 실제 DOM에 반영하기 위해 필요합니다.

### Q2. 왜 실제 DOM이 아니라 VNode를 비교하나요

A. VNode는 정규화된 순수 데이터 구조라서 비교가 단순하고 일관적입니다. DOM을 직접 비교하는 것보다 알고리즘 설명도 쉽습니다.

### Q3. 왜 key가 중요하나요

A. 리스트 재정렬에서 같은 항목을 같은 항목으로 인식하게 해 주기 때문입니다. key가 없으면 위치 기준으로 fallback 합니다.

### Q4. 왜 기본 모드를 auto로 두었나요

A. React와 유사하게 key가 있을 때는 key를 identity 기준으로 보고, 없을 때만 위치 기준으로 비교하기 위해서입니다.

### Q5. `REPLACE_NODE`는 언제 나오나요

A. 노드 타입이 다르거나 태그가 다를 때처럼, 기존 DOM을 재사용하기보다 교체하는 것이 더 자연스러운 경우에 나옵니다.

### Q6. `MOVE_CHILD`는 언제 나오나요

A. key-aware 비교에서 같은 child가 살아 있지만 위치만 바뀌었다고 판단될 때 나옵니다.
