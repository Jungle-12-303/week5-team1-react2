# 업데이트 흐름과 스케줄링 정리

## 1. 문서 목적

본 문서는 현재 week5 v3 런타임에서 상태 업데이트가 어떤 순서로 처리되는지,
그리고 `sync` / `microtask batching`이 실제로 무엇을 제어하는지 설명하기 위한 문서다.

특히 아래 질문에 답하는 것을 목표로 한다.

- `setState` 이후 어떤 함수가 어떤 순서로 호출되는가
- `queueMicrotask()`는 여기서 왜 사용되는가
- 이 구현이 작업을 나눠 처리하는가, 아니면 시작 시점만 미루는가
- 실제 React의 스케줄링과는 무엇이 다른가

## 2. 결론 먼저

현재 구현은 상태 업데이트를 처리할 때 다음 전략을 사용한다.

- `sync` 모드: `setState` 직후 즉시 `update()` 실행
- `microtask` 모드: `setState` 직후 즉시 실행하지 않고, 현재 동기 코드가 끝난 뒤 `update()` 한 번 실행

중요한 점은 다음과 같다.

- `microtask`는 업데이트의 **시작 시점**을 조금 늦춘다.
- 하지만 실제 업데이트 작업 자체를 여러 조각으로 **쪼개지는 않는다**.
- 즉, 한 번 `update()`가 시작되면 `render -> diff -> patch -> commit`을 한 흐름으로 끝까지 수행한다.

따라서 이 구조는 "비동기처럼 예약은 하지만, React concurrent rendering처럼 작업 단위를 세분화하지는 않는 구조"라고 이해하면 정확하다.

## 3. `queueMicrotask()`는 여기서 왜 적절한가

`queueMicrotask(callback)`은 callback을 microtask queue에 넣는다.

의미는 다음과 같다.

- 지금 실행 중인 함수는 끝까지 실행한다.
- 현재 클릭 핸들러 같은 동기 코드도 끝까지 실행한다.
- 그 직후 microtask queue를 비우면서 callback을 실행한다.

즉, `queueMicrotask()`는 "아주 잠깐 뒤"로 실행을 미루는 도구다.

이 프로젝트에서 이것이 적절한 이유는 다음과 같다.

- 같은 클릭 핸들러 안에서 여러 `setState`가 연달아 호출될 수 있다.
- 그때 매번 즉시 `update()`를 돌리면 불필요한 중복 렌더가 생길 수 있다.
- microtask로 미루면 현재 핸들러가 끝난 뒤 상태 변경 결과를 한 번에 반영할 수 있다.

예를 들어:

```js
setSelectedCardId(cardId);
setCurrentPage("detail");
```

위와 같은 코드가 같은 동기 구간 안에 있으면,
microtask batching은 두 상태 변경을 한 번의 `update()`로 합칠 수 있다.

## 4. 하지만 이것은 작업 분할이 아니다

이 부분이 가장 중요하다.

현재 구현은 callback을 사용해 업데이트 시작을 늦추기는 하지만,
실제 작업 단위를 쪼개거나 중간에 양보하지는 않는다.

즉:

- `queueMicrotask()`는 `update()` 호출 시점만 제어한다.
- `update()`가 시작되면 내부 작업은 한 번에 진행된다.

현재 `update()`는 사실상 아래 단계를 한 흐름으로 수행한다.

1. 루트 `App` 재실행
2. 자식 함수형 컴포넌트 전개
3. 새 VNode 생성
4. 이전 VNode와 diff
5. patch 적용
6. effect commit

따라서 이 구조는 "비동기 예약"은 있지만, "작업 분할형 스케줄링"은 아니다.

## 5. 현재 프로젝트의 전체 업데이트 흐름

아래는 실제 호출 순서를 기준으로 정리한 ASCII 순서도다.

```text
[사용자 클릭]
   |
   v
[브라우저가 해당 DOM 이벤트 핸들러 실행]
   |
   v
[핸들러 내부에서 setState 호출]
   |
   v
[useState setter]
   |
   |-- 이전 값과 같으면 종료
   |
   |-- 값이 달라지면 hook slot.value 갱신
   |
   v
[scheduleUpdate(component)]
   |
   |-- component.isMounted 아니면 종료
   |
   |-- batching === "sync" ?
   |      |
   |      +-- yes --> [component.update() 즉시 실행]
   |      |
   |      +-- no
   |
   |-- batching === "microtask"
          |
          |-- 이미 scheduledUpdate 있음 --> 종료
          |
          |-- 없으면 token 저장
          |-- queueMicrotask(() => flushScheduledUpdate(...))
          |
          v
   [현재 클릭 핸들러 종료]
          |
          v
   [microtask queue flush]
          |
          v
   [flushScheduledUpdate(component, token)]
          |
          |-- 취소됐거나 unmount면 종료
          |
          +-- component.update()
                    |
                    v
             [performRender()]
                    |
                    |-- 루트 App 다시 실행
                    |-- 자식 함수 컴포넌트 전개
                    |-- 새 VNode 생성
                    |
                    v
             [engine.patch(nextVNode)]
                    |
                    |-- diff(oldVNode, nextVNode)
                    |-- applyPatches(dom, patches)
                    |
                    v
             [commitEffects()]
                    |
                    v
             [업데이트 완료]
```

## 6. `sync`와 `microtask`의 차이

같은 동기 구간 안에서 아래 코드가 실행된다고 가정하자.

```js
setA(1);
setB(2);
setC(3);
```

### 6.1 `sync` 모드

```text
setA -> update()
setB -> update()
setC -> update()
```

즉, 상태 변경마다 바로 update가 호출될 수 있다.

### 6.2 `microtask` 모드

```text
setA -> update 예약
setB -> 이미 예약 있음, 추가 예약 안 함
setC -> 이미 예약 있음, 추가 예약 안 함
현재 동기 코드 종료
-> microtask에서 update() 1번 실행
```

즉, 같은 동기 구간의 여러 상태 변경을 하나의 update로 묶는다.

## 7. 현재 앱은 어떤 모드인가

현재 브라우저 데모 앱은 `microtask` 모드로 동작한다.

즉:

- `sync` 모드도 구현되어 있음
- 하지만 실제 앱 엔트리에서는 `microtask`를 사용 중

## 8. `batching`의 의미

이 프로젝트에서 `batching`은 다음 의미로 쓰인다.

- 여러 상태 변경을
- 여러 번 즉시 렌더하지 않고
- 한 번의 `update()`로 합치는 것

단, 이 프로젝트의 batching은 매우 단순하다.

- 같은 동기 구간의 중복 update를 줄이는 수준
- 우선순위가 없다
- 작업 중단과 재개가 없다
- 큰 트리를 부분적으로 나눠 처리하지 않는다

즉, "중복 업데이트 방지용 batching"에 가깝다.

## 9. 실제 React와의 차이

실제 React는 상태 업데이트 이후 내부적으로 훨씬 더 많은 일을 한다.

대표 차이:

- update를 Fiber 트리에 등록한다
- 우선순위를 계산한다
- 작업을 쪼갤 수 있다
- 중간에 yield 하거나 나중에 이어서 할 수 있다
- concurrent rendering 같은 모델을 가진다

반면 현재 구현은 아래에 더 가깝다.

```text
상태 변경
-> update 예약 여부 결정
-> 루트 App 전체 재계산
-> diff
-> patch
-> commit
```

즉, 현재 구현은:

- 업데이트 시작 시점은 약간 제어한다
- 하지만 시작한 뒤의 작업은 일렬로 끝까지 수행한다

## 10. 한 문장 요약

현재 런타임은 `queueMicrotask()`를 이용해 여러 상태 변경을 한 번의 `update()`로 묶을 수 있지만,
실제 React처럼 렌더 작업 자체를 잘게 나누고 우선순위에 따라 스케줄링하는 구조는 아니다.
