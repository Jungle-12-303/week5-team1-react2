# Week5 React-like Runtime

week5 과제인 `Component · State · Hooks` 구현을 위해 만든 React-like UI 런타임 프로젝트입니다. 목표는 실제 React 전체를 복제하는 것이 아니라, 함수형 컴포넌트와 루트 상태 기반 Hook 시스템을 직접 구현하고, 이를 Virtual DOM + Diff + Patch 파이프라인과 연결해 브라우저에서 동작하는 완성도 높은 페이지를 만드는 것입니다.

이 저장소의 장기 React 호환 문서는 [archive/v2](/c:/developer_folder/virtual-dom-engine/archive/v2)에 보관했고, 현재 기준 문서는 week5 제출용 v3 문서입니다.

## 문서 안내

- 요구사항: [docs/requirements.md](/c:/developer_folder/virtual-dom-engine/docs/requirements.md)
- 아키텍처: [docs/architecture.md](/c:/developer_folder/virtual-dom-engine/docs/architecture.md)
- API 명세: [docs/api-spec.md](/c:/developer_folder/virtual-dom-engine/docs/api-spec.md)
- 범위 요약: [docs/week5-scope.md](/c:/developer_folder/virtual-dom-engine/docs/week5-scope.md)

## 이번 과제에서 구현할 핵심

- 루트 컴포넌트를 감싸는 `FunctionComponent` 클래스
- 루트 전용 Hook 저장소 `hooks`
- `mount()`와 `update()` 기반 렌더 사이클
- `unmount()`를 포함한 effect lifecycle 정리
- `useState`, `useEffect`, `useMemo`
- 자식 stateless component와 `props` 전달
- 자식 함수를 실제 VNode로 전개하는 resolver 단계
- 기존 `src/core`의 Virtual DOM / Diff / Patch 재사용
- 사용자 입력과 클릭에 반응하는 브라우저 데모
- 단위 테스트와 기능 테스트

## 실제 React와의 공통점

- 함수형 컴포넌트로 UI를 선언합니다.
- 상태가 바뀌면 다시 렌더링됩니다.
- Hook 호출 순서에 따라 상태를 유지합니다.
- Virtual DOM을 만든 뒤 이전 트리와 비교해 필요한 DOM만 갱신합니다.
- `useEffect`로 렌더 이후 부수 효과를 처리하고, `useMemo`로 파생 계산을 캐시합니다.

## 실제 React와의 차이점

- 상태와 Hook은 루트 컴포넌트에서만 사용합니다.
- 자식 컴포넌트는 상태 없는 pure function입니다.
- Context, Ref, Suspense, Portal, SSR 같은 고급 기능은 제외합니다.
- 공개 API 호환보다 구조 이해와 과제 설명 가능성을 우선합니다.

## 권장 데모 방향

과제 의도를 잘 드러내려면, 단순 카운터보다 여러 자식 컴포넌트가 함께 갱신되는 앱이 좋습니다. 예를 들면 아래 같은 구조가 적합합니다.

- 작업 관리 보드
- 검색 가능한 할 일 목록
- 필터와 통계를 가진 습관 추적기

이런 앱은 루트 상태, stateless child, effect, memo, 리스트 diff를 한 번에 보여주기 좋습니다.

## 현재 코드 기반

이미 존재하는 `src/core`는 아래 기능을 제공합니다.

- [src/core/vnode/h.js](/c:/developer_folder/virtual-dom-engine/src/core/vnode/h.js): 선언형 VNode 생성
- [src/core/reconciler/diff.js](/c:/developer_folder/virtual-dom-engine/src/core/reconciler/diff.js): VDOM 비교
- [src/core/renderer-dom/patch.js](/c:/developer_folder/virtual-dom-engine/src/core/renderer-dom/patch.js): DOM patch 적용
- [src/core/engine/createEngine.js](/c:/developer_folder/virtual-dom-engine/src/core/engine/createEngine.js): low-level 엔진 facade

week5 구현은 이 기반 위에 `FunctionComponent`와 Hook Runtime을 얹는 방향으로 진행합니다.

v3 문서 기준 목표 엔트리포인트는 아래와 같습니다.

- 라이브러리 공개 API: [src/index.js](/c:/developer_folder/virtual-dom-engine/src/index.js)
- 브라우저 데모 앱: [src/app/main.js](/c:/developer_folder/virtual-dom-engine/src/app/main.js)
- 브라우저 데모 셸: [index.html](/c:/developer_folder/virtual-dom-engine/index.html)
- 브라우저 HTML root: `<div id="app"></div>`

## 테스트 전략

단위 테스트로는 Hook 슬롯, VNode 생성, diff, patch, memo/effect 동작을 검증합니다. 기능 테스트로는 실제 사용자 입력과 클릭에 따라 여러 자식 컴포넌트가 같이 갱신되는지 확인합니다. 발표에서는 테스트 케이스와 통과 결과를 함께 설명해야 합니다.

현재 저장소 기준 기본 테스트 결과는 `28 passed, 0 failed, 3 skipped`입니다. v3 구현이 진행되면 Hook runtime과 데모 앱 흐름에 대한 테스트를 추가해 이 결과를 확장해야 합니다.

## 실행

현재 즉시 실행 가능한 검증 명령은 아래 두 가지입니다.

```bash
npm test
```

```bash
npm run build
```

v3 구현 완료 목표 기준 브라우저 데모 엔트리포인트는 `src/app/main.js`입니다. 현재는 데모 앱이 아직 구현되지 않았으므로, 브라우저 실행 명령은 확정되지 않았습니다. 데모 앱 구현 후에는 이 엔트리를 실제로 실행하는 명령과 브라우저 확인 절차를 README에 확정해 적어야 합니다.

브라우저 부트스트랩 표준은 아래와 같습니다.

- `index.html`이 데모 셸 파일입니다.
- HTML 셸은 `<div id="app"></div>`를 포함합니다.
- `src/app/main.js`는 `document.getElementById("app")`로 root를 찾습니다.
- root가 없으면 명시적 오류를 발생시킵니다.
- 문서가 이미 로드되었으면 즉시 mount 하고, 아니면 `DOMContentLoaded` 이후 mount 합니다.
- 앱은 공개 API만 사용해야 하므로 내부 `src/core/...`를 직접 import 하지 않습니다.

현재 보장하는 기본 이벤트와 폼 범위는 `onClick`, `onInput`, `onChange`, `onSubmit`, `onKeydown`, `onFocus`, `onBlur`, 그리고 `input.value`, `checkbox.checked`, `textarea.value`, `select.value` 수준입니다.

## 발표 때 설명해야 할 포인트

- 왜 루트에만 상태를 두었는가
- Hook 상태가 함수 재실행 사이에서 어떻게 유지되는가
- `setState`가 상태 변경 외에 어떤 렌더 작업을 유발하는가
- 자식 컴포넌트가 어떻게 VNode로 전개되는가
- `unmount`에서 cleanup이 왜 필요한가
- Virtual DOM + Diff + Patch가 전체 리렌더보다 왜 유리한가
- 실제 React와 무엇이 같고, 무엇이 단순화되었는가

## 데모 포인트

- 루트 상태 하나가 여러 자식 컴포넌트에 동시에 반영되는 장면
- 입력, 필터, 토글, 정렬 중 두 가지 이상이 결합된 상호작용
- `useMemo`로 파생 계산이 재사용되는 장면
- `useEffect` 실행과 cleanup 시점을 설명할 수 있는 장면
- diff/patch 또는 렌더 횟수를 확인할 수 있는 보조 정보
