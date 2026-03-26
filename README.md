# Virtual DOM Engine

React 유사 Virtual DOM / Diff / Patch 흐름을 학습하고 시연하기 위한 Vanilla JavaScript 기반 엔진과 데모 앱입니다.

이 저장소는 두 가지를 함께 제공합니다.

- 웹앱에서 import 해서 사용할 수 있는 라이브러리 엔트리포인트
- Virtual DOM -> Diff -> Patch -> History 흐름을 눈으로 보여주는 데모 페이지

## 프로젝트 소개

이 프로젝트의 목표는 브라우저 DOM을 Virtual DOM으로 표현하고, 이전 상태와 다음 상태를 비교한 뒤, 변경된 부분만 실제 DOM에 반영하는 과정을 설명 가능한 형태로 구현하는 것입니다.

핵심 단계는 아래와 같습니다.

1. 상태를 VNode 트리로 표현한다.
2. 이전 트리와 다음 트리를 비교해 patch list를 만든다.
3. patch list를 실제 DOM에 적용한다.
4. 결과 snapshot을 history에 저장한다.
5. undo / redo로 이전 상태를 다시 재현한다.

## 환경 전제

- 라이브러리 공개 형식은 ESM 기준입니다.
- 런타임 대상은 브라우저입니다.
- `Node >= 18`은 빌드와 테스트 실행 기준입니다.
- 원격 Git 저장소는 현재 배포용 패키지 저장소가 아니라 소스 저장소 기준으로 운영합니다.

## 왜 Virtual DOM을 사용하는가

실제 DOM은 브라우저 렌더링 파이프라인과 연결되어 있어, 구조나 속성 변경이 누적되면 layout 계산과 paint 비용으로 이어질 수 있습니다. 작은 변경에도 subtree 전체를 다시 만들면 불필요한 작업이 많아집니다.

이 프로젝트는 먼저 Virtual DOM 차원에서 "무엇이 바뀌었는지"를 계산한 뒤, 필요한 DOM 작업만 수행하는 방식을 보여줍니다.

## 브라우저 DOM 조작에 사용한 주요 API

- `document.createElement()`
  - element node 생성
- `document.createTextNode()`
  - text node 생성
- `appendChild()`, `insertBefore()`, `removeChild()`, `replaceChild()`
  - patch 단계에서 실제 DOM 변경 반영
- `setAttribute()`와 property assignment
  - 속성/프로퍼티 반영
- `addEventListener()`, `removeEventListener()`
  - 선언형 이벤트 prop 반영

## Reflow / Repaint 관점

- Reflow
  - 레이아웃 계산이 다시 필요한 상태
- Repaint
  - 화면 픽셀을 다시 그려야 하는 상태

모든 DOM 변경이 같은 비용을 가지는 것은 아닙니다. 이 엔진의 목적은 변경이 없는 부분은 최대한 건드리지 않도록 하여 불필요한 DOM 작업을 줄이는 데 있습니다.

## 구조 요약

문서 기준 구조는 `docs/architecture.md`를 따릅니다. 현재 구현은 아래 계층으로 나뉩니다.

- `src/core/vnode`
  - VNode 생성과 children normalization
- `src/core/reconciler`
  - old/new VNode 비교와 flat patch list 생성
- `src/core/renderer-dom`
  - VNode -> DOM 렌더링, DOM -> VDOM 변환, patch 적용
- `src/core/history`
  - snapshot push, undo, redo, currentIndex 관리
- `src/core/engine`
  - 라이브러리 facade API 제공
- `src/demo`
  - 학습/검증용 UI와 시나리오

`core`는 재사용 가능한 라이브러리 계층이고, `demo`는 이를 설명하고 검증하는 UI 계층입니다.

## VNode / Patch / History 개요

### VNode

이 프로젝트의 canonical VNode는 크게 아래 정보를 가집니다.

```js
{
  type: "element" | "text",
  tag: "div" | null,
  key: "item-1" | null,
  props: {},
  events: {},
  children: [],
  text: null,
  meta: {
    source: "dom" | "declarative"
  }
}
```

### Patch

Diff 결과는 tree가 아니라 flat patch list로 표현합니다. 대표 patch 타입은 아래와 같습니다.

```js
SET_PROP
REMOVE_PROP
SET_TEXT
INSERT_CHILD
REMOVE_CHILD
MOVE_CHILD
REPLACE_NODE
SET_EVENT
REMOVE_EVENT
```

### History

History는 아래 구조를 사용합니다.

```js
{
  entries: [vnode1, vnode2, vnode3],
  currentIndex: 1,
  maxLength: null
}
```

이 프로젝트는 `entries + currentIndex` 방식을 택했습니다. 발표와 디버깅에서 현재 상태, 과거 상태, redo 구간을 눈으로 설명하기 쉽고, snapshot 기반이라 undo / redo 동작을 직관적으로 검증하기 좋기 때문입니다.

## Diff 알고리즘 설명

기본 철학은 key-aware `auto` 모드입니다.

- key가 있는 형제 노드는 key를 우선으로 비교합니다.
- key가 없는 경우 위치 기반으로 fallback 합니다.
- 학습과 동작 비교를 위해 `index` 모드와 `keyed` 모드도 제공합니다.

### Diff 모드 비교

| Mode | 목적 | 비교 기준 |
| --- | --- | --- |
| `auto` | 기본 동작 | key가 있으면 key 우선, 없으면 index fallback |
| `index` | 학습/비교용 | 모든 child를 위치 기반으로 비교 |
| `keyed` | 고급 검증용 | key 중심 비교와 이동 표현을 명시적으로 확인 |

### 핵심 diff 케이스

1. node 추가
2. node 제거
3. text 변경
4. prop 변경
5. tag 변경 또는 subtree replace

Diff는 아래 순서로 진행됩니다.

1. old/new 노드 존재 여부 비교
2. node type 비교
3. tag 비교
4. props 비교
5. events 비교
6. children 비교

children 비교는 flat patch list를 생성하며, 재정렬이 가능한 경우 `MOVE_CHILD`로 표현합니다.

더 자세한 설명은 [guides/diff-algorithm-guide.md](./guides/diff-algorithm-guide.md)를 참고할 수 있습니다.

## Patch 적용 방식

Patch 단계는 diff 결과를 실제 DOM에 순서대로 적용합니다. 이 프로젝트는 기본 전략으로 전체 `innerHTML` 덮어쓰기를 사용하지 않고, 변경된 지점만 반영하는 방향을 택합니다.

적용 과정은 아래와 같습니다.

1. path로 목표 DOM 위치를 찾는다.
2. prop / event / text / child 조작을 patch 타입에 따라 적용한다.
3. 실제 DOM이 목표 VNode와 일치하도록 상태를 갱신한다.

## 설치

### 1. npm 배포 패키지 설치

npm registry에 배포된 뒤에는 일반적인 방식으로 설치하면 됩니다.

```bash
npm install virtual-dom-engine
```

### 2. 로컬 경로 설치

같은 머신에서 개발 중인 프로젝트에 연결할 때는 로컬 경로 설치를 사용할 수 있습니다.

```bash
npm install ../virtual-dom-engine
```

### 3. 원격 Git 저장소 설치 전략

현재 원격 Git 저장소는 소스 저장소 기준으로 운영합니다. 따라서 `dist/`는 저장소에 커밋하지 않으며, 원격 Git URL을 곧바로 소비자 의존성으로 사용하는 방식은 기본 경로로 권장하지 않습니다.

권장 전략은 아래와 같습니다.

1. 원격 저장소를 clone 한다.
2. 의존성을 설치한다.
3. 로컬에서 빌드한다.
4. 필요하면 tarball을 만든 뒤 소비 프로젝트에 설치한다.

```bash
git clone <repo-url>
cd virtual-dom-engine
npm install
npm run build
npm pack
```

그 다음 생성된 tarball을 소비 프로젝트에서 설치할 수 있습니다.

```bash
npm install ../virtual-dom-engine/virtual-dom-engine-0.1.0.tgz
```

즉, 현재 저장소는 "source of truth" 역할에 가깝고, 외부 소비용 설치 경로는 npm 배포 패키지 또는 로컬에서 빌드한 산출물을 기준으로 생각하는 편이 안전합니다.

## 빠른 시작

```js
import { createEngine, h } from "virtual-dom-engine";

const root = document.getElementById("app");

const initialVNode = h(
  "div",
  { className: "card" },
  h("h1", null, "Hello"),
  h("p", null, "Initial state")
);

const engine = createEngine({
  root,
  initialVNode,
  diffMode: "auto",
});

engine.render(initialVNode);

const nextVNode = h(
  "div",
  { className: "card updated" },
  h("h1", null, "Hello"),
  h("p", null, "Patched state")
);

engine.patch(nextVNode);
```

## 공개 API

루트 엔트리포인트는 아래 export를 제공합니다.

```js
createEngine
h
domToVNode
diff
applyPatches
createHistory
```

상세 계약은 [docs/api-spec.md](./docs/api-spec.md)를 따릅니다.

문서에 없는 내부 파일 경로나 내부 필드는 안정 API로 간주하지 않습니다.

### 안정 API 예시

- `createEngine(options)`
- `engine.render(vnode)`
- `engine.patch(nextVNode)`
- `engine.undo()`
- `engine.redo()`
- `engine.getCurrentVNode()`
- `engine.getHistory()`
- `engine.inspect()`
- `h(tag, props, ...children)`
- `domToVNode(domNode, options)`
- `diff(oldVNode, newVNode, options)`
- `applyPatches(rootDom, patches, context)`
- `createHistory(initialVNode, options)`

## 실제 React와 유사한 점과 다른 점

### 유사한 점

- Virtual DOM 기반 비교
- key-aware reconciliation
- 최소 DOM 변경 지향

### 다른 점

- Fiber, Scheduler, Concurrent Rendering 없음
- Hook system 없음
- JSX compiler 없음
- synthetic event delegation 전체 구현 없음

## 자동 테스트

자동 테스트는 Node 기반으로 실행합니다.

```bash
npm test
```

현재 자동 테스트는 아래 범위를 검증합니다.

- `vnode`
  - text vnode 생성
  - children flatten / normalization
  - key / event 분리
- `reconciler`
  - text, prop, insert, remove, replace
  - `auto`, `index`, `keyed` 모드 차이
  - event patch 생성
- `history`
  - snapshot push
  - undo / redo
  - redo branch 절단
- `utils`, `inspect`, `i18n`
  - 보조 유틸과 inspect 결과

현재 `patch`, `engine`, `integration` 테스트는 브라우저 DOM 의존성이 있어 Node 테스트에서는 skip 됩니다. 따라서 자동 테스트 통과만으로 브라우저 동작 전체가 검증된 것으로 보지는 않습니다.

## 브라우저 수동 검증

브라우저에서는 데모 페이지를 열어 아래 항목을 수동 검증합니다.

- 초기 샘플 로드 후 actual panel / test panel 동기화 확인
- HTML 편집 후 Patch 클릭 시 부분 변경 반영 확인
- 리스트 reorder 시 `auto`, `index`, `keyed` 차이 확인
- `MOVE_CHILD`가 필요한 시나리오 설명
- event handler change 시나리오 확인
- Undo / Redo 및 history index 이동 확인
- diff log / patch log / vnode viewer 확인
- sanitize 이후 preview / actual 동기화 확인

## 검증 과정과 결과 요약

현재 기준 검증 흐름은 아래와 같습니다.

1. `npm test`로 Node 기반 회귀 테스트를 실행한다.
2. 브라우저에서 데모 페이지를 연다.
3. Patch / Undo / Redo / History Panel 동작을 직접 확인한다.
4. scenario 전환과 diff mode 전환을 확인한다.
5. sanitize 정책이 위험한 입력을 제거하는지 확인한다.

자동 테스트와 브라우저 수동 검증을 분리해 두어, 어떤 부분이 코드 수준에서 회귀 방지되고 어떤 부분이 UI 수준에서 확인되는지 구분할 수 있게 했습니다.

## 주요 엣지 케이스

- key 없는 리스트 재정렬
- key 있는 리스트 재정렬
- prop만 바뀌는 경우
- text만 바뀌는 경우
- 이벤트 핸들러 변경
- undo 이후 새 patch로 redo 구간 절단
- whitespace-only text node 처리
- 잘못된 HTML 입력 이후 sanitize
- HTML sanitize 이후 preview / actual 동기화

## 보안과 제한사항

이 프로젝트는 학습과 데모 목적의 엔진이며, 완전한 sandbox를 목표로 하지 않습니다.

데모의 HTML 편집기에서는 최소한의 sanitize 정책을 적용합니다.

- `<script>` 제거
- `<iframe>`, `<object>`, `<embed>` 제거
- inline `on*` 속성 제거
- `javascript:` 계열 URL 차단

다만 sanitize는 `demo` 계층의 책임이며, `core` 라이브러리 자체가 일반적인 HTML 보안 엔진을 제공하는 것은 아닙니다.

추가 제한사항은 아래와 같습니다.

- 현재 패키지는 ESM 기준입니다.
- 브라우저 사용을 전제로 하며 SSR 대응은 목표 범위가 아닙니다.
- React와 동일한 reconciliation이나 runtime을 구현한 것은 아닙니다.
- 내부 구현 파일 경로는 공개 안정 API가 아닙니다.

## 현재 구현 범위와 향후 확장 로드맵

현재 범위:

- key-aware diff
- patch 적용
- history
- demo page
- 다국어 데모 UI

향후 확장 후보:

- stronger VNode validation
- public diff mode API 문서 정리
- browserless 비중이 더 높은 renderer 검증
- npm registry 배포
- component / runtime 확장 포인트 구체화

## 실행 방법

### 데모 페이지 실행

정적 파일 서버로 루트를 열면 됩니다.

```bash
python -m http.server 4173
```

그 다음 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:4173/index.html
```

### 라이브러리 빌드

```bash
npm run build
```

현재 빌드 결과는 `dist/`에 생성되지만, 저장소 정책상 `dist/`는 버전 관리 대상에 포함하지 않습니다.

## 발표 데모 시나리오

추천 시나리오는 아래 순서를 따릅니다.

1. Playground에서 HTML 편집 후 Patch 적용
2. 리스트 reorder에서 `auto` / `index` / `keyed` 차이 설명
3. Explicit keyed reorder에서 `MOVE_CHILD` 설명
4. Event handler change에서 `SET_EVENT` 설명
5. Undo / Redo와 History Panel 이동 시연

## 문서 안내

- [docs/requirements.md](./docs/requirements.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/api-spec.md](./docs/api-spec.md)
- [guides/implementation-guide.md](./guides/implementation-guide.md)
- [guides/demo-page-design.md](./guides/demo-page-design.md)
