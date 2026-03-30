# Week5 v3 요구사항 정의서

## 1. 문서 목적

본 문서는 week5 과제인 `Component · State · Hooks` 구현을 위한 기준 문서이다.
목표는 실제 React 전체를 복제하는 것이 아니라, 과제의 의도를 최대한 충실히 반영하면서도 발표와 데모에 충분한 완성도를 갖춘 `React-like 함수형 UI 런타임`을 구현하는 것이다.

본 문서는 다음을 정의한다.

- 구현해야 할 사용자 기능
- 반드시 지켜야 할 과제 제약
- 권장 확장 범위
- 테스트와 최종 승인 기준

세부 구조는 `architecture.md`, 공개 API 계약은 `api-spec.md`를 따른다.

## 2. 기준 문서와 우선순위

v3 문서의 직접 기준은 다음 두 축이다.

- 저장소 내부 설계 문서
- `local/[week5] (112) 수요 코딩회 (수요일)`에 적힌 과제 요구

문서 우선순위는 아래와 같다.

- `architecture.md`
- `api-spec.md`
- `requirements.md`
- `README.md`

`docs/week5-scope.md`는 범위 설명 보조 문서이며, 상기 우선순위를 대체하지 않는다.

## 3. 구현 목표

프로젝트는 브라우저에서 동작하는 단일 페이지 애플리케이션 형태의 데모를 제공해야 하며, 다음 목표를 만족해야 한다.

- 함수형 컴포넌트 기반 UI를 직접 구현한다.
- 상태 변경 시 전체 페이지를 다시 만들지 않고, Virtual DOM + Diff + Patch로 필요한 부분만 갱신한다.
- Root Component에서 `useState`, `useEffect`, `useMemo`를 실제로 사용 가능하게 만든다.
- 자식 컴포넌트는 `props`만 받아 렌더링하는 순수 함수로 유지한다.
- 사용자의 입력, 클릭, 토글, 리스트 조작 등 상호작용에 따라 화면이 즉시 반응한다.
- 단위 테스트와 기능 테스트로 핵심 동작을 검증한다.
- README만으로 발표가 가능할 정도로 구조와 검증 결과를 설명할 수 있어야 한다.

## 4. 핵심 제약

다음 항목은 과제의 핵심 제약으로 간주하며, 구현 중 완화할 수 없다.

- 컴포넌트는 반드시 함수형 컴포넌트로 구현한다.
- 루트 컴포넌트는 `FunctionComponent` 클래스로 감싼다.
- `FunctionComponent`는 최소한 `hooks` 저장소, `mount()`, `update()`를 가진다.
- `FunctionComponent`는 최종 종료를 위한 `unmount()`를 가져야 한다.
- Hook은 루트 컴포넌트에서만 사용한다.
- 상태는 루트 컴포넌트에서만 관리한다.
- 자식 컴포넌트는 상태를 가지지 않는 stateless component이다.
- 자식 컴포넌트는 부모가 전달한 `props`만으로 렌더링한다.
- 기존 week3/4의 Virtual DOM, Diff, Patch 자산을 재사용한다.
- 외부 프레임워크 React, Vue 등은 사용하지 않는다.

## 5. 필수 구현 범위

### 5.1 컴포넌트 모델

다음 기능은 반드시 구현해야 한다.

- 루트 함수형 컴포넌트를 관리하는 `FunctionComponent` 클래스
- 함수형 컴포넌트의 `props` 전달
- 자식 컴포넌트 합성
- 조건부 렌더링
- 배열 기반 리스트 렌더링
- `key`를 사용하는 리스트 항목 식별
- 이벤트 핸들러 전달
- 텍스트 노드와 일반 DOM element 혼합 렌더링

### 5.2 상태와 Hook

다음 Hook 기능은 반드시 구현해야 한다.

- `useState`
- `useEffect`
- `useMemo`

Hook 시스템은 다음 규칙을 만족해야 한다.

- Hook 상태는 호출 순서 기반으로 저장한다.
- 각 Hook은 루트 컴포넌트의 `hooks` 저장소에 인덱스 순서대로 기록한다.
- 같은 렌더 사이클에서 같은 순서의 Hook 슬롯을 재사용한다.
- `useState`는 초기값과 함수형 업데이트를 지원한다.
- `setState` 호출 시 루트 컴포넌트의 재렌더가 예약되거나 즉시 수행되어야 한다.
- `unmount` 이후에 호출된 `setState`는 no-op으로 처리되어야 하며, DOM을 다시 갱신하면 안 된다.
- `useEffect`는 렌더와 DOM 반영이 끝난 뒤 실행된다.
- `useEffect`는 dependency 비교를 지원해야 한다.
- `useEffect` cleanup은 다음 effect 실행 전과 unmount 시점에 처리된다.
- `useMemo`는 dependency가 변하지 않으면 이전 계산값을 재사용한다.

### 5.3 렌더링 파이프라인

렌더링 파이프라인은 다음 흐름을 따라야 한다.

1. 루트 컴포넌트 함수 실행
2. Virtual DOM 생성
3. 이전 Virtual DOM과 Diff 수행
4. Patch 계산
5. 실제 DOM 반영
6. effect commit 및 cleanup 처리

아래 항목은 필수이다.

- 최초 mount 시 전체 Virtual DOM을 DOM으로 변환한다.
- update 시 이전 VDOM과 다음 VDOM을 비교한다.
- 변경된 노드만 DOM에 반영한다.
- props 변경, 텍스트 변경, 자식 순서 변경, 이벤트 변경이 patch에 반영된다.
- 루트 DOM 컨테이너는 일관되게 유지한다.
- 자식 함수형 컴포넌트는 렌더 전개 단계에서 VNode 트리로 해석되어야 한다.

### 5.4 브라우저 데모 애플리케이션

데모 애플리케이션은 최소한 아래를 만족해야 한다.

- 브라우저에서 실행 가능하다.
- 사용자의 클릭이나 입력으로 화면이 바뀐다.
- 루트 상태를 기반으로 여러 자식 컴포넌트가 함께 갱신된다.
- form control 또는 검색 입력 등 실제 입력 흐름이 존재한다.
- 리스트 추가, 삭제, 토글, 필터, 정렬 중 두 가지 이상을 포함한다.
- `useEffect`가 필요한 실제 부가 동작이 존재한다.
- `useMemo`가 필요한 파생 계산이 존재한다.
- 최소 보장 이벤트 범위인 `click`, `input`, `change`, `submit`, `keydown`, `focus`, `blur` 중 필요한 항목을 사용해도 정상 동작해야 한다.
- 최소 보장 form 범위인 `input.value`, `checkbox.checked`, `textarea.value`, `select.value` 중 필요한 항목을 사용해도 정상 동작해야 한다.

## 6. 권장 확장 범위

아래 항목은 과제 의도 안에서 구현 가치를 크게 높이는 권장 범위다.

- 여러 개의 `useState` 슬롯 지원
- 여러 개의 `useEffect` 슬롯 지원
- 여러 개의 `useMemo` 슬롯 지원
- microtask 기반 기본 batching
- 중복 렌더 방지를 위한 update 예약 큐
- key 기반 리스트 이동 패치 최적화
- effect cleanup 테스트
- 메모이제이션 효과 검증용 성능 로그
- 렌더 횟수 및 patch 내역을 확인하는 개발용 inspect 정보
- 히스토리 또는 undo/redo 기능과의 결합

권장 범위는 구현 대상이지만, 과제 제출의 1차 합격 조건은 5장의 필수 구현 범위 충족이다.

## 7. 비범위

다음 항목은 v3 범위에서 제외한다.

- 실제 React와의 공개 API 1:1 호환
- 클래스 컴포넌트
- 자식 컴포넌트 자체 상태
- 자식 컴포넌트 내부 Hook
- Context API
- Ref 시스템
- Portal
- Suspense
- Concurrent Rendering
- Transition, Deferred Update
- SSR, Hydration, Streaming Rendering
- Server Component
- 외부 store 연동용 고급 Hook
- React DevTools 호환
- warning 문구 parity

위 항목은 장기 확장 후보일 수 있으나, week5 과제용 v3 승인 범위에는 포함하지 않는다.

## 8. 과제 의도에 맞춘 최대 구현 방향

v3는 "최소한의 흉내"가 아니라 "과제 제약을 유지하는 범위에서 가능한 높은 완성도"를 목표로 한다.
따라서 아래 항목은 적극 권장한다.

- 루트 상태 하나가 아니라 여러 상태 조합으로 실제 앱 흐름 구성
- 자식 컴포넌트 세분화로 UI 구조를 명확히 표현
- 상태 끌어올리기 패턴을 의도적으로 사용
- 파생 데이터 계산을 `useMemo`로 분리
- DOM 반영 이후 수행되어야 하는 후처리를 `useEffect`로 분리
- 이벤트 중심 상호작용 외에 검색, 필터, 체크, 정렬 같은 복합 시나리오 지원
- patch 내역 또는 렌더 흐름을 시각적으로 확인할 수 있는 보조 패널 제공

## 9. 테스트 요구사항

### 9.1 단위 테스트

다음 항목은 단위 테스트로 검증해야 한다.

- VNode 생성
- props 및 children 정규화
- diff 결과 생성
- patch 적용
- `useState`의 상태 유지
- `useState` 함수형 업데이트
- `useEffect` dependency 비교
- `useEffect` cleanup 호출
- `useMemo` 캐시 유지와 무효화
- Hook 호출 순서 기반 슬롯 재사용
- key 기반 리스트 변경 처리
- `unmount` 시 effect cleanup 처리
- 자식 함수형 컴포넌트 해석 결과가 올바르게 VNode로 전개되는지 여부

### 9.2 기능 테스트

다음 항목은 기능 테스트 또는 통합 테스트로 검증해야 한다.

- 최초 렌더링
- 사용자 입력에 따른 화면 갱신
- 클릭 이벤트에 따른 상태 변경
- 루트 상태 변경이 여러 자식 컴포넌트에 전파되는지 여부
- 리스트 추가/삭제/토글/필터/정렬 시 DOM 결과
- effect 실행 및 cleanup 시점
- memoized 계산 재사용 여부
- 루트 `unmount` 이후 DOM 정리와 cleanup 호출 여부

### 9.3 엣지 케이스

가능한 한 아래 엣지 케이스를 테스트에 포함한다.

- 빈 배열 리스트
- null, false, undefined 자식 처리
- 연속 `setState`
- 같은 값으로 상태 갱신 시 처리 정책
- dependency 배열이 없는 effect
- dependency 배열이 빈 effect
- key가 없는 리스트와 key가 있는 리스트의 차이

## 10. README 요구사항

README는 발표 기준 문서이므로 다음 내용을 포함해야 한다.

- 프로젝트 개요
- week5 과제와의 연결
- 구현한 핵심 기능
- 실제 React와의 공통점과 차이점
- 컴포넌트 구조 설명
- 상태와 Hook 동작 설명
- Virtual DOM + Diff + Patch 흐름
- 테스트 전략 및 결과
- 실행 방법
- 데모 포인트

문서 작성 단계에서 데모 앱 실행 명령이 아직 확정되지 않았다면, README는 아래 두 가지를 분리해 적어야 한다.

- 현재 즉시 실행 가능한 명령
- 데모 앱 구현 후 확정될 실행 절차

## 11. 공개 엔트리포인트 요구사항

v3 구현은 아래 엔트리포인트를 기준으로 공개 구조를 맞춰야 한다.

- 라이브러리 공개 API 엔트리포인트: `src/index.js`
- 브라우저 데모 애플리케이션 엔트리포인트: `src/app/main.js`

`src/index.js`는 최소한 아래 API를 외부에 노출해야 한다.

- `FunctionComponent`
- `createApp`
- `h`
- `useState`
- `useEffect`
- `useMemo`

## 12. 앱 통합 계약

v3 라이브러리를 사용하는 앱은 아래 계약을 따라야 한다.

- 앱은 반드시 `src/index.js`를 통해 공개 API를 import 해야 한다.
- 앱은 `src/core/...` 내부 구현 파일에 직접 의존하면 안 된다.
- 브라우저 데모 애플리케이션의 진입 파일은 `src/app/main.js`다.
- 브라우저 데모 HTML 셸 파일은 `index.html`이다.
- 브라우저 HTML 셸은 최소한 `<div id="app"></div>`를 포함해야 한다.
- `src/app/main.js`는 `document.getElementById("app")`로 root element를 조회해야 한다.
- root element를 찾지 못하면 명시적 오류를 발생시켜야 한다.
- 데모 앱은 하나의 루트 `FunctionComponent` 기준으로 mount 해야 한다.
- 앱 종료 시 `unmount()`를 호출해 effect cleanup과 예약 작업 정리를 완료해야 한다.

### 12.1 createApp 옵션 분류

`createApp`의 옵션은 아래처럼 구분한다.

- 필수 옵션: `root`, `component`
- 일반 선택 옵션: `props`, `batching`
- 개발용 선택 옵션: `diffMode`, `historyLimit`

### 12.2 createApp 기본값

구현은 아래 기본값을 따라야 한다.

- `props`: 빈 객체와 동등한 상태
- `batching`: `"sync"`
- `diffMode`: `"auto"`
- `historyLimit`: `null`

`diffMode`와 `historyLimit`는 앱 비즈니스 기능이 아니라 개발, 검증, 시연 편의를 위한 옵션으로 간주한다.

### 12.3 unmount 시 예약 작업 처리 정책

루트가 `unmount()` 될 때 구현은 아래 정책을 따라야 한다.

- 아직 실행되지 않은 예약 update는 취소해야 한다.
- microtask 기반 batching이 켜져 있으면 예약된 flush는 더 이상 DOM 작업을 수행하면 안 된다.
- commit 되지 않은 pending effect는 실행하지 않고 폐기해야 한다.
- 이미 commit 된 effect의 cleanup은 `unmount` 과정에서 실행해야 한다.
- `unmount` 이후 발생한 setter 호출은 no-op 이어야 한다.

### 12.4 앱 부트스트랩 정책

브라우저 데모 앱은 아래 정책을 따라야 한다.

- 문서 로딩이 끝난 뒤 root를 찾고 mount 해야 한다.
- `document.readyState`가 이미 `interactive` 또는 `complete`면 즉시 시작할 수 있다.
- 그렇지 않으면 `DOMContentLoaded` 이후 시작해야 한다.
- 브라우저 데모는 루트 하나만 mount 해야 한다.

## 13. 산출물

최종 산출물은 아래를 포함해야 한다.

- week5 v3 요구사항 문서
- week5 v3 아키텍처 문서
- week5 v3 API 명세서
- 발표용 README
- 브라우저 데모 애플리케이션
- Hook/VDOM/Diff/Patch 단위 테스트
- 기능 테스트
- `archive/v2`에 보관된 장기 React 호환 문서

## 14. 최종 승인 기준

아래 조건을 모두 만족해야 week5 v3 구현 완료로 본다.

- 루트 컴포넌트가 `FunctionComponent` 클래스로 관리된다.
- 루트 컴포넌트에서 `useState`, `useEffect`, `useMemo`가 동작한다.
- 자식 컴포넌트는 stateless component로 동작한다.
- 상태 변경 시 Virtual DOM diff/patch를 거쳐 필요한 DOM만 갱신된다.
- `unmount` 시 effect cleanup과 루트 정리가 수행된다.
- `src/index.js`가 문서에 정의된 v3 공개 API를 노출한다.
- `src/app/main.js`가 브라우저 데모 엔트리포인트로 동작한다.
- 앱이 `src/index.js`만 사용해 정상 구동되며, 내부 `src/core` 경로에 직접 의존하지 않는다.
- 브라우저 HTML 셸과 root element 계약이 README에 설명되어 있다.
- `index.html`이 브라우저 데모 셸 파일로 동작한다.
- 데모 페이지가 사용자 상호작용에 따라 의미 있게 변한다.
- 컴포넌트 구성, 상태 흐름, Hook 유지 방식이 README에 설명되어 있다.
- 단위 테스트와 기능 테스트가 모두 존재하고 통과한다.
- 구현자가 핵심 로직을 발표에서 설명할 수 있을 정도로 구조가 명확하다.
