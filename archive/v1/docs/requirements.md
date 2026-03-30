# React 유사 Virtual DOM / Diff / Patch 시스템 요구사항 정의서

## 1. 문서 목적

본 문서는 Vanilla JavaScript만 사용하여 React와 유사한 Virtual DOM 기반 렌더링 시스템을 구현하기 위한 요구사항을 정의한다.

이 문서는 "무엇을 만들어야 하는가"와 "어떤 수준까지 검증되어야 하는가"를 규정한다.
구체적인 설계 결정, 계층 구조, 데이터 계약은 [architecture.md](./architecture.md)에서 정의한다.
공개 API의 시그니처와 입력/출력 계약은 [api-spec.md](./api-spec.md)에서 정의한다.

## 2. 문서 권한과 관련 문서

문서 우선순위는 다음과 같다.

1. `architecture.md`
2. `api-spec.md`
3. `requirements.md`
4. `README.md`

문서 간 충돌이 발견되면 구현을 진행하지 말고 충돌 내용을 먼저 해소해야 한다.

다음 문서는 보조 문서이며, 위 우선순위 문서를 구체화하기 위한 참고 자료로 사용한다.

- [implementation-guide.md](../guides/implementation-guide.md)
- [quality-guide.md](../guides/quality-guide.md)
- [demo-and-readme-guide.md](../guides/demo-and-readme-guide.md)
- [diff-algorithm-guide.md](../guides/diff-algorithm-guide.md)

보조 문서는 구현 절차, 품질 상세 기준, 발표/README 운영 가이드를 제공한다.
보조 문서가 상위 권한 문서와 충돌할 경우 상위 권한 문서를 따른다.

## 3. 원문 요구사항 요약

본 프로젝트는 다음 원문 요구를 충실히 만족해야 한다.

- 브라우저 DOM을 Virtual DOM으로 변환한다.
- 두 Virtual DOM의 차이를 계산하는 Diff 알고리즘을 구현한다.
- 변경된 부분만 실제 DOM에 반영하는 Patch 시스템을 구현한다.
- 이를 검증할 수 있는 웹 페이지를 제공한다.
- 실제 영역, 테스트 영역, Patch, Undo, Redo 기능을 제공한다.
- 상태 이력을 관리하고 특정 시점으로 이동할 수 있어야 한다.
- HTML, CSS, JavaScript(Vanilla)만 사용한다.
- 결과물은 발표 가능한 데모이자 재사용 가능한 라이브러리여야 한다.

## 4. 프로젝트 목표

본 프로젝트는 단순 DOM 조작 데모가 아니라 다음 목표를 동시에 만족해야 한다.

1. 브라우저 DOM 기반 Virtual DOM 변환 기능 제공
2. 이전/현재 트리 비교를 통한 Diff 계산
3. 실제 DOM에 대한 부분 Patch 적용
4. 사람이 설명 가능한 검증 페이지 제공
5. 외부 프로젝트에서 사용할 수 있는 라이브러리 형태 제공
6. 향후 React 유사 구조로 확장 가능한 기반 확보

## 5. 범위

### 5.1 구현 범위

다음 항목은 1차 구현 범위에 포함한다.

- Virtual DOM 자료구조
- DOM -> VDOM 변환
- VDOM -> DOM 렌더링
- Diff 알고리즘
- Patch 시스템
- History 관리
- 검증용 데모 페이지
- 설치/배포 가능한 라이브러리 패키징
- 테스트 코드와 README

### 5.2 반드시 포함할 추가 범위

다음 항목은 최소 구현의 일부로 포함한다.

- 선언형 `h(tag, props, ...children)` API
- 이벤트 prop의 최소 지원
- 기본 key-aware reconciliation 지원
- 학습/비교용 index-only diff 모드 제공
- 고급 비교/검증용 explicit keyed diff 모드 제공
- 데모와 코어 라이브러리의 분리
- 장기 확장을 고려한 모듈 경계 유지

### 5.3 비목표

다음 항목은 1차 구현의 비목표로 둔다.

- Fiber
- Scheduler
- Concurrent rendering
- Hook system 실제 구현
- Full JSX compiler
- React와 100% 동일한 reconciliation
- Synthetic event delegation 전체 재현

단, 위 항목은 README와 architecture 문서에서 향후 확장 대상으로 설명되어야 한다.

## 6. 기술 스택과 제약

### 6.1 기술 스택

- HTML
- CSS
- JavaScript (Vanilla)

### 6.2 제약

- React, Vue, Svelte 등 프레임워크 사용 금지
- 외부 상태관리 라이브러리 사용 금지
- 외부 Virtual DOM 라이브러리 사용 금지
- 핵심 알고리즘 구현을 대체하는 외부 패키지 사용 금지
- 빌드 도구는 라이브러리 패키징을 위해 사용할 수 있으나 핵심 로직은 직접 구현해야 한다

## 7. 핵심 기능 요구사항

### 7.1 DOM -> Virtual DOM 변환

시스템은 브라우저의 실제 DOM을 순회하여 Virtual DOM 트리로 변환할 수 있어야 한다.

필수 요구사항:

- Element node를 tag, props, children 중심의 vnode로 변환해야 한다.
- Text node를 별도 text vnode로 변환해야 한다.
- Comment node는 기본적으로 무시해야 한다.
- attribute를 props로 수집해야 한다.
- `class`는 내부적으로 `className`으로 정규화할 수 있어야 한다.
- 공백-only text node 유지 여부는 정책으로 고정하고 문서화해야 한다.
- 잘못된 HTML이 브라우저에서 자동 보정된 경우, 보정된 DOM 구조를 기준으로 처리해야 한다.

### 7.2 Virtual DOM -> DOM 렌더링

시스템은 Virtual DOM으로부터 실제 DOM을 생성하고 container에 렌더링할 수 있어야 한다.

필수 요구사항:

- element node는 실제 element로 생성해야 한다.
- text node는 실제 text node로 생성해야 한다.
- props를 DOM attribute/property에 반영해야 한다.
- children을 재귀적으로 렌더링해야 한다.
- 이벤트 prop이 있는 경우 렌더 단계에서 실제 리스너를 연결해야 한다.
- `value`, `checked`, `selected` 등 property 기반 반영 항목을 올바르게 처리해야 한다.

### 7.3 선언형 Virtual Node 생성 API

시스템은 테스트 코드와 라이브러리 사용성을 위해 선언형 `h()` API를 제공해야 한다.

필수 요구사항:

- string child를 text vnode로 자동 변환해야 한다.
- children flatten을 지원해야 한다.
- `null`, `false` child 처리 정책을 문서화해야 한다.
- key와 이벤트 prop을 받을 수 있어야 한다.

### 7.4 Diff 알고리즘

시스템은 이전 vnode와 현재 vnode를 비교하여 patch list를 생성해야 한다.

반드시 지원해야 하는 핵심 케이스:

1. 노드 추가
2. 노드 삭제
3. 노드 타입 변경
4. 태그 변경
5. 속성, 텍스트, 자식 변경

추가 요구사항:

- 이벤트 prop 변경을 지원해야 한다.
- 기본 diff 모드는 key-aware 방식이어야 한다.
- key가 있는 형제 노드 집합은 key를 우선 기준으로 비교해야 한다.
- key가 없는 경우에는 위치 기반 비교로 fallback 해야 한다.
- 학습 및 시연을 위해 index-only 비교 모드를 제공해야 한다.
- 고급 검증과 동작 비교를 위해 explicit keyed 비교 모드를 제공해야 한다.
- 전체 재렌더링이 아니라 변경점 탐지 중심으로 동작해야 한다.
- 가능한 한 기존 DOM 노드를 재사용해야 한다.

### 7.5 Patch 시스템

시스템은 diff 결과를 실제 DOM에 적용하여 변경된 부분만 반영해야 한다.

필수 요구사항:

- patch list를 순차 적용할 수 있어야 한다.
- patch 후 실제 DOM은 목표 vnode와 일치해야 한다.
- 전체 `innerHTML` 덮어쓰기를 기본 전략으로 사용하면 안 된다.
- property 제거, 이벤트 교체, subtree replace를 올바르게 처리해야 한다.
- patch 결과를 로그나 화면에서 확인할 수 있어야 한다.

### 7.6 History

시스템은 상태 이력을 관리하고 Undo/Redo를 지원해야 한다.

필수 요구사항:

- 기본 구현은 `entries + currentIndex` 방식을 사용해야 한다.
- patch 성공 시 새로운 vnode snapshot을 history에 push 해야 한다.
- undo 시 이전 상태로, redo 시 다음 상태로 이동해야 한다.
- undo 이후 새 patch가 발생하면 redo 구간을 제거해야 한다.
- 단순 렌더 동기화는 history를 push 하지 않아야 한다.
- 실제 영역, 테스트 영역, 내부 current state가 항상 동기화되어야 한다.

## 8. 데모 및 검증 페이지 요구사항

### 8.1 필수 UI 구성 요소

다음 요소는 반드시 포함되어야 한다.

1. 실제 영역
2. 테스트 영역
3. HTML 편집 영역 또는 테스트 조작 UI
4. Patch 버튼
5. Undo 버튼
6. Redo 버튼
7. Reset 버튼
8. 현재 history index 표시
9. Diff 결과 표시 영역
10. Patch 로그 표시 영역
11. 현재 Virtual DOM 트리 표시 영역
12. 테스트 실행 버튼 또는 테스트 섹션

### 8.2 초기 로드 흐름

초기 로드 시 다음 흐름을 만족해야 한다.

1. 샘플 HTML을 실제 영역에 렌더링한다.
2. 실제 영역 DOM을 Virtual DOM으로 변환한다.
3. 생성된 Virtual DOM을 초기 상태로 저장한다.
4. 같은 Virtual DOM을 이용해 테스트 영역을 렌더링한다.
5. history에 초기 상태를 저장한다.

### 8.3 사용자 수정 흐름

테스트 영역 수정은 다음 원칙을 따른다.

- 기본 방식은 HTML 편집기 + 미리보기 방식으로 한다.
- 필요 시 보조적인 테스트 조작 UI를 추가할 수 있다.
- 사용자가 입력한 HTML은 안전하게 정제된 결과만 미리보기와 patch 대상으로 사용할 수 있다.

### 8.4 Patch 흐름

Patch 버튼 클릭 시 다음 흐름을 만족해야 한다.

1. 테스트 영역의 현재 상태를 다시 Virtual DOM으로 만든다.
2. 이전 Virtual DOM과 비교하여 diff 결과를 만든다.
3. diff 결과를 실제 영역에 patch 한다.
4. 적용 후 실제 영역은 현재 상태와 일치해야 한다.
5. 새로운 Virtual DOM을 history에 저장해야 한다.
6. diff 결과와 patch 결과를 로그 패널에 보여줘야 한다.

### 8.5 Undo / Redo 흐름

Undo / Redo 동작 시 다음 조건을 만족해야 한다.

- 이동한 상태의 Virtual DOM을 기준으로 실제 영역과 테스트 영역이 함께 갱신되어야 한다.
- 내부 current state와 history index가 함께 갱신되어야 한다.
- 첫 상태에서 undo, 마지막 상태에서 redo를 안전하게 처리해야 한다.

### 8.6 이벤트 검증 방식

보안과 일관성을 위해 이벤트 관련 검증은 다음 규칙을 따른다.

- 사용자가 입력한 HTML의 인라인 이벤트 속성은 실행 대상으로 허용하지 않는다.
- 이벤트 prop 변경 검증은 선언형 `h()` 기반 샘플 시나리오 또는 테스트 코드로 수행한다.
- DOM -> VDOM 변환 경로에서는 실제 DOM에 바인딩된 리스너를 일반적으로 복원할 수 없음을 명시해야 한다.

## 9. 데이터와 동작 정책 요구사항

다음 정책은 구현 전에 문서로 고정되어야 하며, 상세 canonical shape는 `architecture.md`에서 정의한다.

- vnode는 element node와 text node를 명확히 구분해야 한다.
- key 저장 위치는 일관되어야 한다.
- props와 이벤트 표현 방식은 일관되어야 한다.
- whitespace 처리 정책은 일관되어야 한다.
- diff 결과 표현 방식은 프로젝트 전체에서 하나로 고정되어야 한다.
- key-aware diff에서 재정렬을 어떤 patch 조합으로 표현할지 명확히 정의해야 한다.

## 10. 보안 및 안정성 요구사항

테스트용 HTML 편집 기능은 다음 요구를 만족해야 한다.

- `script` 태그 실행을 방지해야 한다.
- `on*` 인라인 이벤트 속성을 제거하거나 무시해야 한다.
- `javascript:` URL과 유사한 실행 경로를 차단해야 한다.
- 잘못된 HTML 입력이 들어와도 앱이 중단되지 않아야 한다.
- 대량 노드 붙여넣기 상황에서도 실패를 사용자에게 설명할 수 있어야 한다.
- README에는 본 프로젝트가 학습/데모 목적이며 완전한 sandbox가 아님을 명시해야 한다.

## 11. 테스트 요구사항

### 11.1 필수 테스트 범주

다음 테스트가 포함되어야 한다.

- DOM -> VDOM 변환 테스트
- `h()` 및 children normalization 테스트
- diff 테스트
- patch 테스트
- history 테스트
- 통합 테스트
- core와 demo의 분리 검증 테스트

### 11.2 필수 검증 항목

최소 다음 항목을 검증해야 한다.

- text 변경
- prop 변경
- node 추가
- node 삭제
- node replace
- child 재정렬
- key-aware 비교
- index-only 비교
- explicit keyed 비교
- 이벤트 변경
- patch 적용 후 DOM 일치 여부
- undo / redo 정확성

### 11.3 테스트 실행 방식

아래 중 하나 이상을 제공해야 한다.

1. 브라우저 내 테스트 버튼
2. 콘솔 테스트 실행 함수
3. 간단한 assertion 유틸 또는 스크립트 기반 테스트 실행

## 12. 엣지 케이스 요구사항

다음 항목은 최소한 처리하거나 문서화해야 한다.

- 빈 children
- null children
- 연속 text node
- 공백-only text node
- oldVNode만 존재하는 경우
- newVNode만 존재하는 경우
- 같은 위치의 key 충돌
- key 누락 및 중복
- patch 대상 path 누락
- 삭제 후 인덱스 밀림
- 첫 상태 undo / 마지막 상태 redo
- 잘못된 HTML 입력
- script 태그 입력
- 이벤트 속성 인라인 입력

## 13. 성능 요구사항

이번 과제는 극한 성능보다 설명 가능한 알고리즘 구현과 검증을 우선한다.

그럼에도 다음 항목은 측정 가능해야 한다.

- domToVNode 소요 시간
- diff 소요 시간
- patch 소요 시간
- 전체 렌더 소요 시간
- 변경된 노드 개수

또한 소규모~중간 규모 DOM 트리에서 체감상 즉각적으로 동작해야 한다.

## 14. 코드 품질 요구사항

다음 원칙을 만족해야 한다.

- 코드가 사람이 읽고 설명할 수 있는 형태여야 한다.
- 의미 있는 함수명과 모듈명을 사용해야 한다.
- 하나의 함수는 하나의 책임에 집중해야 한다.
- 핵심 알고리즘은 단계별로 나뉘어 있어야 한다.
- 복잡한 분기, key/index 비교, 이벤트 교체, history 절단 로직에는 설명 가능한 주석이 있어야 한다.
- 데모 코드가 코어 내부 구현을 직접 침범하면 안 된다.

## 15. 라이브러리 배포 요구사항

최종 결과물은 데모 앱과 별도로 외부 프로젝트에서 사용할 수 있는 라이브러리여야 한다.

필수 요구사항:

- 명확한 패키지 엔트리포인트 제공
- 공개 API 문서화
- `package.json` 작성
- 최소 하나 이상의 배포용 빌드 산출물 제공
- README에 설치 방법, 빠른 시작 예제, 데모 실행 방법, 제한사항 포함

공개 API의 상세 계약은 `api-spec.md`를 따른다.

## 16. 문서화 및 발표 요구사항

README는 필수 산출물이며 다음 항목을 포함해야 한다.

1. 프로젝트 소개
2. Virtual DOM 개요
3. 브라우저 DOM 조작에 사용한 주요 API와 역할 요약
4. 왜 실제 DOM 직접 조작이 느릴 수 있는지에 대한 설명
5. Reflow / Repaint 관점의 설명
6. Diff 알고리즘 설명
7. Patch 적용 방식
8. History 설계 요약
9. 공개 API 사용 예제
10. 테스트 전략
11. 검증 과정과 결과 요약
12. 주요 엣지 케이스
13. 실제 React와 유사한 점과 다른 점
14. 현재 구현 범위와 향후 확장 로드맵
15. 실행 방법
16. 발표 데모 시나리오

발표 자료는 별도로 만들지 않고 README 중심으로 설명할 수 있어야 한다.
발표에서는 테스트 케이스 존재 여부뿐 아니라 실제 검증 과정과 결과도 함께 설명할 수 있어야 한다.

## 17. 산출물

최종 산출물에는 다음이 포함되어야 한다.

- 실행 가능한 전체 코드
- 데모 페이지
- 라이브러리 엔트리포인트
- `package.json`
- README
- 테스트 코드
- 요구사항 문서
- 아키텍처 문서
- API 명세 문서

## 18. 최종 승인 기준

다음 조건을 만족해야 완료로 간주한다.

1. 브라우저에서 직접 실행 가능하다.
2. 초기 샘플 HTML을 actual DOM -> virtual DOM -> test DOM 흐름으로 생성한다.
3. Patch 버튼 클릭 시 이전 vnode와 현재 vnode를 비교하여 변경 부분만 실제 영역에 반영한다.
4. Undo / Redo가 정상 동작한다.
5. diff log / patch log / history index가 보인다.
6. 최소 10개 이상의 테스트 케이스가 존재한다.
7. key-aware 재정렬 시나리오와 `auto` / `index` 비교 차이를 설명할 수 있다.
8. explicit keyed 모드를 시연하거나 테스트로 검증할 수 있다.
9. 이벤트 prop 변경 시나리오를 선언형 샘플 또는 테스트로 검증할 수 있다.
10. 라이브러리 형태로 import 가능한 엔트리포인트가 있다.
11. README만으로 발표가 가능하다.
12. 핵심 코드에 충분한 설명과 주석이 있다.
13. demo와 core가 분리되어 있다.
14. reconciler / renderer / history / engine 경계가 문서와 코드에서 확인 가능하다.
15. 보안 정책에 따라 사용자 입력 HTML이 정제된 후 처리된다.
