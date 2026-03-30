# SSR / Streaming / Resume 세부 명세 v2

## 1. 문서 목적

본 문서는 v2에서 지원하는 SSR, streaming, resume, static prerender의 세부 공개 계약을 정의한다.
상위 범위는 `requirements.md`, 공개 API는 `api-spec.md`, 구조 책임은 `architecture.md`를 따른다.

## 2. 지원 범위

다음 API를 다룬다.

- `renderToString`
- `renderToStaticMarkup`
- `renderToReadableStream`
- `renderToPipeableStream`
- `resume`
- `resumeToPipeableStream`
- `prerender`
- `prerenderToNodeStream`

다음 API는 비범위다.

- `resumeAndPrerender`
- `resumeAndPrerenderToNodeStream`

## 3. 공통 규칙

- `identifierPrefix`와 `useId` 결과는 client/hydration과 호환되어야 한다.
- Suspense fallback과 resolved content의 공개 결과가 React와 의미적으로 호환되어야 한다.
- `onError`는 recoverable/non-recoverable server 오류를 React 호환 분류로 보고해야 한다.
- bootstrap resource 옵션은 문서화된 순서와 의미를 유지해야 한다.
- postponed state는 serialize, resume, disposal 수명주기가 분명해야 한다.

## 4. `renderToString`

- 동기 문자열을 반환해야 한다.
- hydration 가능한 HTML 결과를 만들어야 한다.
- Suspense는 string 렌더 환경에 맞는 fallback 결과를 노출해야 한다.
- `identifierPrefix`가 반영되어야 한다.

## 5. `renderToStaticMarkup`

- 비상호작용 정적 HTML을 반환해야 한다.
- hydration 대상이 아닌 결과를 만들어야 한다.
- interactive bootstrap resource를 자동 요구하면 안 된다.

## 6. `renderToReadableStream`

반환 shape:

- `ReadableStream`
- `allReady: Promise<void>`

계약:

- shell이 준비되면 stream이 읽기 가능 상태가 되어야 한다.
- `allReady`는 모든 Suspense 경계가 준비된 뒤 resolve되어야 한다.
- abort 이후 error reporting과 이후 읽기 가능 surface는 React와 호환되어야 한다.
- bootstrap script / module / asset 출력 순서는 React와 호환되어야 한다.

## 7. `renderToPipeableStream`

반환 shape:

- `pipe(writable)`
- `abort(reason?)`

지원 callback surface:

- `onShellReady`
- `onAllReady`
- `onShellError`
- `onError`

계약:

- `onShellReady`는 초기 shell을 전송할 수 있을 때 호출되어야 한다.
- `onAllReady`는 전체 content가 준비되었을 때 호출되어야 한다.
- `onShellError`는 shell 자체를 만들지 못하는 경우를 보고해야 한다.
- `onError`는 stream 중 오류를 React 호환 분류로 보고해야 한다.
- `pipe()`와 callback 호출 순서는 React와 호환되어야 한다.

## 8. `resume`

- postponed state를 입력으로 받아 이어서 rendering 결과를 생성해야 한다.
- prerender 또는 server rendering이 남긴 state와만 호환되어야 한다.
- 잘못된 postponed state는 React 호환 오류 surface를 가져야 한다.

## 9. `resumeToPipeableStream`

- resume semantics와 pipeable stream semantics를 함께 만족해야 한다.
- shell 재구성과 resumed content 전환 시 ordering은 React와 호환되어야 한다.
- abort / error / callback surface도 React와 호환되어야 한다.

## 10. `prerender`

반환 shape:

- Promise 기반 결과
- 최소한 `prelude`와 postponed state를 포함하는 React 호환 결과

계약:

- prerender는 static output과 이후 resume용 state를 함께 생성할 수 있어야 한다.
- Suspense가 있는 경우 postponed state가 남을 수 있어야 한다.
- bootstrap resource 옵션과 `identifierPrefix`를 반영해야 한다.

## 11. `prerenderToNodeStream`

- node stream 환경에서 prerender 결과를 생성해야 한다.
- 완료 시점, 오류 보고, postponed state 산출 시점은 React와 호환되어야 한다.

## 12. 순서 규칙

다음은 parity에서 반드시 비교해야 한다.

- bootstrap asset 출력 순서
- shell ready / all ready / shell error / error callback 순서
- abort 이후 잔여 output과 error surface
- postponed state 생성 시점
- resume 입력 소비 후 state 해제 시점
- stream 완료 시점

## 13. 테스트 포인트

- Node stream 환경
- Web Stream 환경
- shell만 먼저 준비되는 Suspense tree
- allReady 이후 전체 직렬화
- abort 시나리오
- postponed state 기반 resume
- static prerender 후 resume 연결

## 14. 비고

warning 문자열과 profiler 수치처럼 byte 단위 또는 숫자 완전 동일성까지 요구하지 않는 항목이 있더라도, SSR / streaming의 반환 shape와 callback surface는 공개 API이므로 완화 대상이 아니다.
