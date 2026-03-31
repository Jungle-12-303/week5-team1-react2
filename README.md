# Week5 React-like Runtime

week5 과제인 `Component · State · Hooks` 구현을 위해 만든 React-like UI 런타임 프로젝트입니다. 현재 시연 앱은 `카드 컬렉션 쇼케이스`이며, 포켓몬 공개 데이터를 활용해 `단일 루트 엔트리 기반 상태 기반 다중 페이지 SPA`를 구현했습니다.

이 저장소의 장기 React 호환 문서는 [archive/v2](./archive/v2)에 보관했고, 현재 기준 문서는 week5 제출용 v3 문서입니다.

## 문서 안내

- 요구사항: [docs/requirements.md](./docs/requirements.md)
- 아키텍처: [docs/architecture.md](./docs/architecture.md)
- API 명세: [docs/api-spec.md](./docs/api-spec.md)
- 범위 요약: [docs/week5-scope.md](./docs/week5-scope.md)
- 시연 앱 기획: [docs/demo-app-plan.md](./docs/demo-app-plan.md)
- 학습 문서: [learning-docs/overview.md](./learning-docs/overview.md)

## 프로젝트 개요

이 프로젝트의 목적은 실제 React 전체를 복제하는 것이 아니라, week5 과제의 의도에 맞게 아래 핵심 개념을 직접 구현하고 설명 가능한 형태로 만드는 것입니다.

- 함수형 컴포넌트
- 루트 전용 상태 관리
- `useState`, `useEffect`, `useMemo`
- Virtual DOM + Diff + Patch
- 브라우저에서 동작하는 상호작용 데모

현재 앱은 단순 예제가 아니라, 외부 데이터를 불러오고 여러 화면이 상태를 공유하는 카드 쇼케이스 서비스로 구성되어 있습니다.

## 현재 구현한 핵심 기능

- 루트 컴포넌트를 감싸는 `FunctionComponent` 클래스
- 루트 전용 Hook 저장소 `hooks`
- `mount()`, `update()`, `unmount()`를 포함한 렌더 사이클
- `useState`, `useEffect`, `useMemo`
- 자식 stateless component와 `props` 전달
- 자식 함수형 컴포넌트를 일반 VNode로 전개하는 resolver 단계
- 기존 `src/core`의 Virtual DOM / Diff / Patch 재사용
- microtask batching 기반 업데이트
- 브라우저 데모 앱과 기능 테스트

## 현재 시연 앱

현재 시연 앱은 `카드 컬렉션 쇼케이스`입니다.

구성 페이지:

- `Dashboard`
- `Collection`
- `Detail`
- `Settings`

이 앱은 기술적으로는 하나의 루트 앱이지만, 사용자는 여러 페이지를 오가는 서비스처럼 느끼게 설계했습니다. 페이지 전환은 별도 mount가 아니라 루트 상태 `currentPage`를 바꾸는 방식으로 동작합니다.

## 과제 요구와 앱의 연결

과제에서 요구하는 핵심 요소가 앱에서 어떻게 사용되는지는 아래와 같습니다.

- `Component`
  - 페이지 컴포넌트와 공통 UI 컴포넌트를 분리했습니다.
  - 예: [src/app/pages/DashboardPage.js](./src/app/pages/DashboardPage.js), [src/app/components/CardTile.js](./src/app/components/CardTile.js)
- `State`
  - 모든 상태는 루트 [src/app/App.js](./src/app/App.js)에 있습니다.
  - 예: `currentPage`, `cards`, `selectedCardId`, `settings`, `searchKeyword`
- `Hooks`
  - `useState`: 페이지 전환, 카드 목록, 설정, 필터, 즐겨찾기 상태
  - `useEffect`: 문서 제목 변경, 카드 데이터 로딩, 상세 데이터 로딩, localStorage 저장
  - `useMemo`: 필터/정렬 결과, KPI 수치, 선택 카드, 타입 요약
- `Virtual DOM + Diff + Patch`
  - `setState` 이후 루트 컴포넌트를 다시 실행하고, 이전/다음 VDOM을 비교해 필요한 DOM만 갱신합니다.
- `실제 브라우저 상호작용`
  - 카드 검색, 타입 필터, 정렬, 즐겨찾기 토글, 페이지 전환, 설정 변경이 모두 동작합니다.

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

## 현재 앱 구조

- 공개 API 엔트리포인트: [src/index.js](./src/index.js)
- 브라우저 데모 엔트리포인트: [src/app/main.js](./src/app/main.js)
- 루트 앱: [src/app/App.js](./src/app/App.js)
- HTML 셸: [index.html](./index.html)

주요 앱 구성:

- 공통 셸: [src/app/components/AppShell.js](./src/app/components/AppShell.js)
- 컬렉션 카드: [src/app/components/CardTile.js](./src/app/components/CardTile.js)
- 상세 카드 프리뷰: [src/app/components/CardShowcase.js](./src/app/components/CardShowcase.js)
- 원격 데이터 로더: [src/app/data/pokeApiClient.js](./src/app/data/pokeApiClient.js)
- fallback 데이터: [src/app/data/cardLibrary.js](./src/app/data/cardLibrary.js)

## 데이터와 이미지 출처

현재 카드 데이터와 이미지는 아래 공개 소스를 사용합니다.

- 데이터: `PokeAPI` `https://pokeapi.co/api/v2/...`
- 이미지: `PokeAPI sprites`의 `official-artwork` 및 기본 sprite

정규 전국도감 기준으로 `#001 ~ #1025`까지만 카탈로그에 포함합니다. 이 범위를 넘어가는 엔트리는 시연 앱에서 제외합니다.

원격 로드가 실패하면:

- 마지막 성공 캐시가 있으면 캐시를 사용하고
- 없으면 [src/app/data/cardLibrary.js](./src/app/data/cardLibrary.js)의 fallback 카드로 내려갑니다.

## 상태와 데이터 흐름

핵심 상태는 모두 [src/app/App.js](./src/app/App.js)에 있습니다.

- `currentPage`
- `cards`
- `selectedCardId`
- `searchKeyword`
- `typeFilter`
- `favoritesOnly`
- `sortMode`
- `settings`
- `lastAction`

흐름 요약:

1. [src/app/main.js](./src/app/main.js)에서 `createApp()`으로 앱을 mount 합니다.
2. [src/app/App.js](./src/app/App.js)가 루트 상태를 만들고 원격 카탈로그를 로드합니다.
3. `useMemo`로 필터/정렬 결과와 KPI를 계산합니다.
4. `currentPage` 값에 따라 `Dashboard`, `Collection`, `Detail`, `Settings` 페이지를 전환합니다.
5. 카드 기울기와 반짝임은 루트 상태가 아니라 DOM 스타일 변수로 처리해, 고빈도 마우스 이동에서도 전체 앱이 다시 렌더되지 않게 합니다.

## 카드 시각 효과 설계

카드의 3D 틸트와 홀로그램 효과는 데이터 상태와 분리되어 있습니다.

- 데이터 상태가 담당하는 것
  - 카드 선택
  - 즐겨찾기
  - 필터/정렬
  - 페이지 전환
  - 설정 반영
- DOM 스타일이 담당하는 것
  - 카드 기울기
  - 홀로그램 표면 이동
  - 스파클/글로우 효과

이 분리는 week5 과제의 상태 관리 구조를 유지하면서도, 시연에서 시각적으로 더 인상적인 결과를 얻기 위한 설계입니다.

## 테스트 전략과 결과

단위 테스트:

- Hook 슬롯 재사용
- `useState`, `useEffect`, `useMemo`
- diff / patch
- form semantics
- inspect/runtime 동작
- PokeAPI 카탈로그 정규 범위 제한

기능 테스트:

- 앱 최초 렌더
- 컬렉션 검색/선택
- 즐겨찾기 반영
- 설정 즉시 반영
- 원격 카탈로그 fallback 안내

현재 테스트 결과:

- `64 passed, 0 failed, 0 skipped`

## 실행 방법

기본 검증 명령:

```bash
npm test
```

```bash
npm run build
```

브라우저 데모 기준:

- HTML 셸은 [index.html](./index.html)입니다.
- 루트 DOM은 `<div id="app"></div>`입니다.
- 앱 엔트리포인트는 [src/app/main.js](./src/app/main.js)입니다.
- `src/app/main.js`는 `document.getElementById("app")`로 root를 찾고 mount 합니다.

정적 서버를 사용해 [index.html](./index.html)을 열면 현재 카드 쇼케이스 앱을 브라우저에서 확인할 수 있습니다.

## 발표 때 설명하면 좋은 포인트

- 왜 상태를 루트 한 곳에만 두었는가
- 자식 컴포넌트가 왜 stateless component인가
- `useMemo`가 카드 필터/정렬 결과와 KPI를 어떻게 재사용하는가
- `useEffect`가 데이터 로드, 문서 제목, localStorage 저장에 어떻게 쓰였는가
- 카드 3D 효과를 왜 state가 아니라 DOM 스타일로 분리했는가
- Virtual DOM + Diff + Patch가 실제 사용자 상호작용에 어떻게 연결되는가

## 현재 상태 요약

현재 구현은 v3 문서의 취지에 맞게 작성되어 있습니다.

- 단일 루트 엔트리 기반 상태 기반 다중 페이지 SPA
- 루트 상태 기반 데이터 흐름
- 자식 stateless component 구조
- `useState`, `useEffect`, `useMemo` 실사용
- 외부 데이터 로딩과 fallback 처리
- 브라우저 시연 가능
- 테스트와 빌드 통과

남은 작업은 구조를 바꾸는 것이 아니라, 발표용 설명과 시각 완성도를 더 다듬는 수준입니다.
