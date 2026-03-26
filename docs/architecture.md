# React 유사 Virtual DOM / Diff / Patch 시스템 아키텍처

## 1. 문서 목적

본 문서는 `requirements.md`를 만족하기 위한 시스템의 구조적 설계를 정의한다.
이 문서는 "어떤 계층으로 나누고 어떤 데이터 계약을 사용할 것인가"를 다룬다.

`requirements.md`와 충돌하는 구현은 허용되지 않으며, 구체 설계 판단은 본 문서를 기준으로 한다.

## 2. 설계 목표

아키텍처는 다음 목표를 동시에 만족해야 한다.

1. 발표와 학습에 적합한 설명 가능성
2. 실제 동작하는 Diff / Patch / History 시스템
3. 데모와 라이브러리의 분리
4. 향후 React 유사 구조로 확장 가능한 계층화
5. 보안상 안전한 테스트 편집 흐름

## 3. 핵심 설계 결정

### 3.1 공개 API의 주 진입점은 engine이다

라이브러리의 기본 진입점은 `createEngine()`으로 한다.
`h`, `domToVNode`, `diff`, `applyPatches`, `createHistory`는 고급 사용과 테스트를 위한 보조 export로 제공한다.

이 결정으로 외부 사용자는 facade 중심으로 접근하고, 내부 구현은 계층별로 교체하기 쉬워진다.

### 3.2 Diff 결과의 canonical 표현은 flat patch list다

Diff의 공식 출력은 사람이 읽기 쉬운 flat patch list로 고정한다.
patch tree는 도입하지 않는다.

이 결정으로 데모 로그, 테스트 기대값, inspect 출력이 하나의 형태로 정렬된다.

### 3.3 기본 reconciliation 모드는 key-aware(auto)다

- 기본 모드는 `auto`
- 보조 모드는 `index`
- 선택 모드는 `keyed`

`auto` 모드는 React 유사 동작을 목표로 한다.
형제 노드 집합에 key가 있으면 key를 우선 기준으로 노드 identity를 판단하고, key가 없으면 위치 기반으로 fallback 한다.
`index` 모드는 학습과 비교 시연을 위한 강제 위치 기반 모드다.
`keyed` 모드는 key 기반 재사용과 재정렬 동작을 명시적으로 검증하기 위한 모드다.

### 3.4 HTML 편집과 이벤트 검증은 분리한다

사용자가 편집하는 HTML은 구조/텍스트/속성 실험을 위한 입력으로 취급한다.
이 경로에서는 실행 가능한 이벤트를 허용하지 않는다.

이벤트 patch 검증은 선언형 `h()` 기반 시나리오 또는 테스트 코드로 수행한다.
이로써 "이벤트 리스너는 DOM -> VDOM 역변환에서 복원할 수 없다"는 제약과 "이벤트 prop patch를 지원해야 한다"는 요구를 동시에 만족한다.

### 3.5 초기 부트스트랩은 실제 DOM -> VDOM 흐름을 유지한다

초기 샘플은 정적 HTML로 actual panel에 먼저 렌더링한다.
그 후 `domToVNode()`로 초기 vnode를 만들고 test panel을 렌더링한다.

초기 샘플에는 실행 로직이 필요한 이벤트를 넣지 않는다.
이벤트 관련 샘플은 별도 선언형 fixture로 제공한다.

### 3.6 history는 entries + currentIndex를 사용한다

기본 history 표현은 다음과 같다.

- `entries: VNode[]`
- `currentIndex: number`

undo/redo를 위한 듀얼 스택은 채택하지 않는다.
history를 변경하는 공식 경로는 초기 snapshot 생성, patch 성공, undo, redo뿐이다.
단순 렌더 동기화는 현재 상태와 DOM만 맞추며 새 snapshot을 추가하지 않는다.
단, 향후 최적화를 위해 inverse patch 기반 history를 추가하는 것은 확장 포인트로 남긴다.

## 4. 시스템 컨텍스트

시스템은 크게 두 부분으로 나뉜다.

1. `core`
   - Virtual DOM 생성, diff, patch, history, engine을 담당한다.
2. `demo`
   - 시각화, HTML 편집, 테스트 실행, 로그 표시를 담당한다.

demo는 core를 소비하는 일반 사용자 역할을 해야 하며 core 내부 상태나 비공개 함수에 직접 의존하면 안 된다.
engine은 자신이 관리하는 actual DOM 루트와 내부 상태/history를 책임진다.
test panel과 HTML 편집기 상태 동기화는 demo 계층이 engine의 현재 vnode를 사용해 수행한다.

## 5. 주요 동작 흐름

### 5.1 부트스트랩

1. 정적 샘플 HTML을 actual panel에 렌더링한다.
2. actual panel의 DOM을 `domToVNode()`로 변환한다.
3. 생성된 vnode를 `history.entries[0]`에 저장한다.
4. 같은 vnode를 test panel에 렌더링한다.
5. engine은 현재 vnode와 history 상태를 관리한다.

### 5.2 HTML 편집 기반 patch

1. 사용자가 HTML 편집기에 내용을 입력한다.
2. 입력 문자열을 sanitize 한다.
3. sanitize 된 결과를 test panel 미리보기에 반영한다.
4. test panel DOM을 다시 `domToVNode()`로 변환한다.
5. `diff(oldVNode, newVNode, { mode })`를 실행한다.
6. `applyPatches(actualRoot, patches, context)`를 실행한다.
7. 성공 시 history에 snapshot을 push 한다.

### 5.3 Undo / Redo

1. history index를 이동한다.
2. engine은 이동한 vnode를 기준으로 actual panel과 내부 current vnode를 갱신한다.
3. demo는 engine이 반환한 current vnode를 기준으로 test panel과 편집기 상태를 갱신한다.
4. inspect 정보와 history 패널도 함께 갱신한다.

### 5.4 이벤트 검증

1. 선언형 fixture가 `h()` 기반 vnode를 생성한다.
2. engine이 vnode를 렌더링한다.
3. 후속 vnode와 diff/patch를 수행한다.
4. 이벤트 연결/교체/제거를 로그와 테스트에서 검증한다.

## 6. 계층 구조

### 6.1 vnode layer

책임:

- vnode 생성
- children normalization
- key, props, events 정규화
- text vnode 생성

비책임:

- DOM 생성
- diff
- history 관리

### 6.2 reconciler layer

책임:

- old/new vnode 비교
- props diff
- children diff
- flat patch list 생성

비책임:

- DOM 조작
- UI 로그 표시

### 6.3 renderer-dom layer

책임:

- vnode로부터 실제 DOM 생성
- DOM -> VDOM 변환
- props/property 적용
- 이벤트 연결/해제
- patch 실행

비책임:

- history 정책
- demo 상태 관리

### 6.4 history layer

책임:

- snapshot push
- undo / redo
- currentIndex 관리
- redo 구간 절단

비책임:

- DOM 렌더링
- diff 계산

### 6.5 engine layer

책임:

- core facade 제공
- current vnode 관리
- diff mode와 history를 통합
- inspect 데이터 제공

비책임:

- HTML sanitize UI
- 패널 레이아웃

### 6.6 demo layer

책임:

- 패널 렌더링
- 편집기와 버튼 처리
- scenario 선택
- 로그 표시
- 테스트 실행 트리거

비책임:

- core 내부 상태 직접 변경
- patch 알고리즘 구현

## 7. 핵심 데이터 계약

### 7.1 VNode canonical shape

프로젝트 전체에서 vnode는 아래 shape를 canonical form으로 사용한다.

```js
{
  type: "element" | "text",
  tag: "div" | null,
  key: "item-1" | null,
  props: {
    id: "app",
    className: "container",
    style: "color:red",
    value: "hello",
    checked: true,
    "data-id": "123"
  },
  events: {
    click: handleClick
  },
  children: [],
  text: null,
  meta: {
    source: "dom" | "declarative",
    isWhitespaceOnly: false,
    path: [0, 1]
  }
}
```

정책:

- `type === "text"`이면 `tag`는 `null`, `children`은 빈 배열, `text`는 문자열이다.
- `type === "element"`이면 `text`는 `null`이다.
- `key`는 항상 최상위 필드에 저장한다.
- `key`는 sibling 집합에서 노드 identity를 표현하는 핵심 필드다.
- `props.key`는 허용하지 않으며 입력 시 `key`로 승격한 뒤 제거한다.
- 이벤트는 `events` 필드에 저장한다.
- DOM -> VDOM 변환 결과의 `events`는 항상 빈 객체다.
- `class`는 `className`으로 정규화한다.
- `style`은 문자열로 유지한다. 객체 style 정규화는 1차 범위에 포함하지 않는다.
- `data-*` 속성은 일반 props로 유지한다.

### 7.2 `h()` 정규화 규칙

`h(tag, props, ...children)`는 다음 규칙으로 입력을 정규화한다.

- `props`가 없으면 빈 객체를 사용한다.
- `key`는 최상위 필드로 분리한다.
- `onClick`, `onInput` 같은 이벤트 prop은 `events.click`, `events.input`으로 정규화한다.
- string, number child는 text vnode로 변환한다.
- 배열 child는 flatten 한다.
- `null`, `undefined`, `false` child는 무시한다.
- `true`는 렌더링하지 않는다.

### 7.3 Patch canonical shape

patch는 flat list로 표현하며 다음 연산을 공식 지원한다.

```js
[
  { type: "SET_PROP", path: [0], name: "className", value: "box selected" },
  { type: "REMOVE_PROP", path: [0], name: "title" },
  { type: "SET_TEXT", path: [1, 0], value: "changed" },
  { type: "INSERT_CHILD", path: [1], index: 2, node: vnode },
  { type: "REMOVE_CHILD", path: [1], index: 0 },
  { type: "MOVE_CHILD", path: [1], fromIndex: 3, toIndex: 1, key: "b" },
  { type: "REPLACE_NODE", path: [2], node: vnode },
  { type: "SET_EVENT", path: [3], name: "click", handler: fn },
  { type: "REMOVE_EVENT", path: [3], name: "click" }
]
```

정책:

- `path`는 루트 기준 child index 경로다.
- `SET_PROP`, `REMOVE_PROP`, `SET_TEXT`, `REPLACE_NODE`, `SET_EVENT`, `REMOVE_EVENT`의 `path`는 대상 노드를 가리킨다.
- `INSERT_CHILD`, `REMOVE_CHILD`, `MOVE_CHILD`의 `path`는 부모 노드를 가리킨다.
- `auto` 또는 `keyed` 모드에서는 재사용 가능한 keyed child에 대해 `MOVE_CHILD`를 우선 사용한다.
- `index` 모드에서는 재정렬을 `REMOVE_CHILD + INSERT_CHILD` 조합으로 표현할 수 있다.
- key가 없는 child는 `auto` 모드에서도 위치 기반 비교 대상으로 처리한다.

### 7.4 History shape

```js
{
  entries: [vnode1, vnode2, vnode3],
  currentIndex: 1,
  maxLength: null
}
```

정책:

- `entries[currentIndex]`가 현재 상태다.
- 새 상태 push 전에 `currentIndex` 뒤의 redo 구간을 제거한다.
- `maxLength`가 설정된 경우 가장 오래된 snapshot부터 제거한다.
- history에는 patch가 아니라 vnode snapshot을 저장한다.

## 8. DOM / 이벤트 모델

### 8.1 DOM -> VDOM의 한계

실제 DOM에서 이미 바인딩된 JavaScript 이벤트 리스너는 표준 API만으로 안전하게 역추적할 수 없다.
따라서 `domToVNode()`는 이벤트를 복원하지 않는다.

이 한계는 결함이 아니라 설계 제약이며, 문서와 데모에서 명시적으로 설명한다.

### 8.2 이벤트 검증 전략

이벤트는 선언형 경로에서만 canonical 하게 관리한다.

- `h()`가 이벤트 prop을 `events`로 저장한다.
- renderer가 `events`를 실제 DOM 리스너로 연결한다.
- patch가 `SET_EVENT`, `REMOVE_EVENT`를 통해 교체/제거한다.

사용자 입력 HTML의 인라인 이벤트는 엔진의 지원 범위가 아니다.

## 9. 안전한 HTML 편집 정책

HTML 편집기는 다음 파이프라인을 따른다.

1. 사용자 입력 문자열 수집
2. 파서 또는 template element로 DOM 생성
3. sanitize 수행
4. sanitize 된 DOM만 test panel에 반영
5. sanitize 된 DOM만 patch 비교 대상으로 사용

최소 sanitize 정책:

- `<script>` 제거
- `<iframe>`, `<object>`, `<embed>` 제거
- `on*` 속성 제거
- `href`, `src`, `xlink:href`의 `javascript:` 차단

이 정책은 demo에서 강제되며 core의 기본 책임은 아니다.
단, sanitize 유틸은 재사용 가능한 보조 모듈로 둘 수 있다.

## 10. 모듈 경계와 권장 파일 구조

```txt
/project
  /docs
    requirements.md
    architecture.md
    api-spec.md

  /src
    /core
      /vnode
        index.js
        h.js
        normalizeChildren.js

      /reconciler
        diff.js
        diffProps.js
        diffChildren.js
        patchTypes.js

      /renderer-dom
        createDom.js
        applyProps.js
        applyEvents.js
        patch.js
        domToVNode.js

      /history
        createHistory.js
        historyApi.js

      /engine
        createEngine.js
        inspect.js

      /shared
        constants.js
        utils.js

    /demo
      main.js
      app.js
      panels.js
      controls.js
      logger.js
      scenarioRunner.js
      testRunner.js
      sanitizeHtml.js

    /samples
      initialHtml.js
      declarativeScenarios.js

    /tests
      vnode.test.js
      reconciler.test.js
      patch.test.js
      history.test.js
      engine.test.js
      integration.test.js
```

## 11. 모듈별 책임

### 11.1 `core/vnode`

- vnode 생성
- child normalization
- key / event 정규화

### 11.2 `core/reconciler`

- vnode 비교
- patch 생성
- diff mode 분기

### 11.3 `core/renderer-dom`

- DOM 생성
- patch 실행
- DOM -> VDOM 변환
- props/property/events 반영

### 11.4 `core/history`

- snapshot 이력
- undo / redo

### 11.5 `core/engine`

- facade API
- 현재 상태 관리
- inspect 데이터 제공

### 11.6 `demo`

- UI 패널
- HTML 편집
- scenario 선택
- 테스트 실행과 로그 표시

## 12. 확장 포인트

현재 구조는 다음 확장을 가로막지 않아야 한다.

- function component 유사 구조
- fragment
- ref
- update queue
- scheduler
- hooks
- custom renderer
- devtools inspect API 확장

이를 위해 다음 금지 사항을 유지한다.

- vnode 생성과 DOM 생성을 한 함수에 혼합하지 않는다.
- diff와 patch를 하나의 모듈로 합치지 않는다.
- history를 demo UI state 안에 숨기지 않는다.
- demo 전역 변수가 core 상태의 소유자가 되지 않게 한다.
- 공개 API가 내부 파일 경로를 직접 노출하지 않게 한다.

## 13. 비목표

이번 아키텍처는 다음을 즉시 구현하지 않는다.

- Fiber 구조
- Concurrent scheduling
- synthetic event delegation 전체 재현
- component lifecycle
- JSX transform

다만 계층 구조는 위 기능을 나중에 추가할 수 있도록 열어 둔다.
