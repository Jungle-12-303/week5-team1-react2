# Week5 v3 범위 요약

## 1. 왜 v3로 다시 정의하는가

기존 v2 문서는 장기적인 React 호환 엔진을 목표로 했고, week5 과제 범위를 크게 초과했다.
v3는 실제 과제의 평가 기준과 구현 집중도를 맞추기 위해 작성된 축소-집중 버전이다.

## 2. Must

- 함수형 컴포넌트
- 루트 전용 `FunctionComponent`
- 루트 전용 상태 관리
- 자식 stateless component
- `useState`
- `useEffect`
- `useMemo`
- Virtual DOM
- Diff
- Patch
- `unmount` lifecycle
- 자식 컴포넌트 전개 resolver
- 라이브러리 공개 엔트리포인트 `src/index.js`
- 데모 엔트리포인트 `src/app/main.js`
- 데모 HTML 셸 `index.html`
- HTML root id `app`
- 기본 이벤트/폼 보장 범위
- 브라우저 데모 페이지
- 단위 테스트
- 기능 테스트

## 3. Should

- 여러 상태 슬롯
- 여러 effect 슬롯
- 여러 memo 슬롯
- key 기반 리스트 갱신
- effect cleanup
- 검색/필터/정렬/토글 조합
- inspect 정보
- README 발표 자료화
- 개발용 `diffMode`, `historyLimit`

## 4. Stretch

- microtask batching
- patch 로그 패널
- undo/redo 연동
- 렌더 횟수 시각화
- memo 성능 비교 지표

## 5. Out

- 클래스 컴포넌트
- Context
- Ref
- Portal
- Suspense
- SSR
- Hydration
- React 공개 API parity
- Server/Streaming 렌더링
