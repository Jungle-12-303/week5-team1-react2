# React 유사 Virtual DOM / Diff / Patch 시스템 구현 가이드

## 1. 문서 목적

본 문서는 `requirements.md`, `architecture.md`, `api-spec.md`를 실제 구현 작업으로 옮길 때 참고할 절차형 가이드다.
이 문서는 구현 순서, 단계별 목표, 현실적인 범위 조정, 작업 체크리스트를 제공한다.

본 문서는 보조 문서다.
요구사항이나 설계 판단이 충돌할 경우 `architecture.md`, `api-spec.md`, `requirements.md`를 우선한다.

## 2. 구현 관점의 핵심 원칙

이번 과제의 핵심은 다음 두 가지를 동시에 만족하는 것이다.

1. 지금 당장 발표 가능한 최소 React-like 엔진을 만든다.
2. 이후에 더 큰 React-like 시스템으로 성장할 수 있는 구조를 확보한다.

따라서 구현 중에는 단기 데모 최적화보다 다음 우선순위를 유지한다.

1. 구조적 분리
2. 설명 가능성
3. 검증 가능성
4. 데모 완성도
5. 장기 확장 포인트 확보

## 3. 현실적 범위 조정

### 3.1 반드시 집중할 것

- DOM <-> VDOM 변환
- diff의 5대 핵심 케이스
- patch 부분 반영
- history 관리
- key 비교 기본 지원
- 검증 페이지
- 라이브러리 패키징
- 테스트와 README
- 장기 확장 가능한 구조 분리

### 3.2 과감히 제외할 것

- Fiber
- Scheduler 실제 구현
- Concurrent rendering
- Hook system 실제 구현
- Full JSX compiler
- Synthetic event delegation 전체

### 3.3 구현 우선순위 판단 기준

새 작업 항목이 생겼을 때는 다음 기준으로 우선순위를 결정한다.

1. 최종 승인 기준을 직접 충족시키는가
2. 핵심 알고리즘 검증에 필요한가
3. 구조적 부채를 줄이는가
4. 발표에서 설명 가치가 큰가
5. 단순 장식성 기능인가

## 4. 단계별 구현 전략

### Phase 1. 프로젝트 골격 구축

목표:

- 디렉터리 구조 생성
- core와 demo의 물리적 분리
- 패키지 엔트리포인트 골격 확보
- 초기 샘플 HTML 준비

완료 조건:

- `src/core`, `src/demo`, `src/tests`, `src/samples`의 기본 구조가 존재한다.
- demo가 향후 core를 import 하도록 설계 방향이 정해져 있다.
- package 초기 설정 파일이 준비되어 있다.

### Phase 2. VNode와 렌더링 기반 구축

목표:

- canonical VNode shape 구현
- `h()` 구현
- children normalization 구현
- `createDomFromVNode()` 구현
- `domToVNode()` 구현

완료 조건:

- 정적 vnode를 실제 DOM으로 렌더링할 수 있다.
- 실제 DOM을 다시 vnode로 변환할 수 있다.
- 텍스트 노드, 속성, 중첩 구조가 안정적으로 처리된다.

### Phase 3. Diff 알고리즘 구현

목표:

- 노드 타입 비교
- 태그 비교
- text 비교
- prop 비교
- key-aware child 비교
- 위치 기반 fallback 비교

완료 조건:

- 변경이 없는 경우 빈 patch list를 반환한다.
- 5대 핵심 diff 케이스를 테스트로 검증할 수 있다.
- patch list가 flat list로 일관되게 생성된다.

### Phase 4. Patch 시스템 구현

목표:

- patch 타입별 실제 DOM 반영
- property 반영과 제거
- subtree replace
- text update
- child insert/remove

완료 조건:

- patch 적용 후 실제 DOM이 목표 vnode와 일치한다.
- 기존 DOM 노드를 가능한 한 재사용한다.
- 이벤트 교체와 제거가 중복 없이 동작한다.

### Phase 5. History 구현

목표:

- `entries + currentIndex` 구조 구현
- push, undo, redo 구현
- redo 구간 절단 구현

완료 조건:

- patch 성공 후 새 snapshot이 push 된다.
- undo/redo 이동 시 current state가 정확히 바뀐다.
- 경계 상태에서 앱이 안전하게 동작한다.

### Phase 6. React 유사성 보강

목표:

- 이벤트 prop 최소 지원
- 기본 `auto` 모드 고도화
- index-only 비교 모드 지원
- explicit keyed 비교 모드 지원
- 재정렬 시나리오 처리

완료 조건:

- 이벤트 patch가 선언형 시나리오에서 검증된다.
- key 없는 재정렬과 key 있는 재정렬 차이를 `auto`와 `index` 비교를 통해 보여줄 수 있다.
- explicit keyed 모드가 `auto` 모드와 어떤 점에서 다른지 시연 또는 테스트로 설명할 수 있다.

### Phase 7. 엔진과 라이브러리 정리

목표:

- `createEngine()` facade 정리
- 공개 export 확정
- demo가 core의 실제 소비자가 되도록 연결

완료 조건:

- demo에서 low-level 내부 파일 직접 참조 없이 동작한다.
- 외부 사용자 관점의 사용 예제가 성립한다.

### Phase 8. 검증 페이지 완성

목표:

- actual/test panel 완성
- HTML 편집기와 sanitize 연결
- diff log, patch log, history panel, vnode viewer 제공
- 테스트 실행 버튼 또는 섹션 제공

완료 조건:

- 사용자 입력 -> 미리보기 -> patch -> history 흐름이 실제로 시연 가능하다.
- 로그와 inspector가 발표 보조 도구로 동작한다.

### Phase 9. 테스트 및 발표 준비

목표:

- unit/integration 테스트 보강
- README 작성
- 데모 시나리오 정리
- known limitations 정리

완료 조건:

- 최소 10개 이상의 테스트 케이스가 준비된다.
- README만으로 발표가 가능하다.

## 5. 구현 체크리스트

### 5.1 core 체크리스트

- vnode shape가 문서와 일치하는가
- key가 항상 최상위 필드로 정규화되는가
- DOM -> VDOM에서 이벤트를 복원하려고 시도하지 않는가
- diff가 renderer 의존 없이 동작하는가
- patch가 flat patch list만을 해석하는가
- history가 UI 상태와 분리되어 있는가

### 5.2 demo 체크리스트

- actual/test panel이 분리되어 있는가
- HTML 입력이 sanitize 되는가
- 인라인 이벤트가 제거되는가
- diff 결과와 patch 결과가 보이는가
- undo/redo 상태가 눈에 보이는가

### 5.3 library 체크리스트

- 루트 엔트리포인트가 명확한가
- 공개 API가 문서화되어 있는가
- 예제가 실제 import 흐름과 일치하는가
- demo 코드가 core 내부 구현에 침범하지 않는가

## 6. 구현 중 자주 발생할 위험

### 6.1 구조 혼합

위험:

- diff와 patch를 한 파일에 섞어 구현하는 경우
- demo 이벤트 핸들러 안에서 history를 직접 조작하는 경우

대응:

- 계층별 책임을 먼저 고정한 뒤 파일을 작성한다.

### 6.2 과도한 최적화

위험:

- 발표 가능한 단순 구조보다 지나치게 복잡한 최적화를 먼저 구현하는 경우

대응:

- 먼저 `auto` 기반 key-aware diff와 기본 patch를 안정화한 뒤, 비교용 `index` 모드를 추가한다.

### 6.3 이벤트 모델 오해

위험:

- DOM -> VDOM 경로에서도 이벤트 복원이 가능하다고 가정하는 경우

대응:

- 이벤트는 선언형 경로에서만 canonical 하게 관리한다.

### 6.4 HTML 편집 보안 누락

위험:

- 편집기에 입력한 `script`, `on*`, `javascript:`를 그대로 반영하는 경우

대응:

- demo 단계에서 sanitize 를 강제한다.

## 7. 구현 완료 전 자체 점검 질문

- 지금 구조가 future renderer 분리를 가로막고 있는가
- 이벤트 검증 경로와 HTML 편집 경로가 섞여 있지 않은가
- demo를 제거해도 core 테스트가 가능한가
- README로 설명할 수 없는 구현 세부가 늘어나고 있지 않은가
- key-aware diff와 index-only diff의 차이를 설명할 실제 동작 예시가 준비되어 있는가

## 8. 산출물 준비 순서 권장안

추천 순서는 다음과 같다.

1. core 최소 렌더링
2. diff
3. patch
4. history
5. engine facade
6. demo UI
7. key-aware diff 안정화
8. explicit keyed 모드 정리
9. 이벤트 patch
10. 테스트
11. README

## 9. 구현 결과의 기대 수준

이번 과제는 "학습용 장난감 구현" 수준을 넘어서야 한다.
즉, 결과물은 다음 상태에 가까워야 한다.

- 발표자가 구조를 설명할 수 있다.
- README 기준으로 흐름을 설명할 수 있다.
- 엣지 케이스 대응이 최소한 문서화되어 있다.
- 포트폴리오에 넣을 수 있을 만큼 완성도가 있다.
