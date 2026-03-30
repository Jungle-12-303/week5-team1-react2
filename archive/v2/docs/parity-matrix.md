# React Parity Matrix v2

## 1. 문서 목적

본 문서는 v2 범위의 안정 공개 API를 `필수`, `완화`, `비범위`로 구분하고, 각 항목의 검증 기준과 테스트 위치를 빠르게 찾기 위한 매트릭스다.
세부 계약은 `api-spec.md`, 시스템 책임은 `architecture.md`, 범위 판단은 `requirements.md`를 따른다.

## 2. 상태 정의

- `필수`
  - React와 의미적으로 호환되어야 하며 parity 테스트 실패를 허용하지 않는다.
- `완화`
  - 공개 계약은 유지하되 byte 단위 동일성 또는 수치 완전 동일성은 요구하지 않는다.
- `비범위`
  - 현재 v2에서 구현 책임을 지지 않는다.

## 3. 모듈별 매트릭스

| 영역 | 대표 API / 기능 | 상태 | 검증 기준 | 주 테스트 위치 |
| --- | --- | --- | --- | --- |
| `react` element | `createElement`, `cloneElement`, `isValidElement`, JSX runtime | 필수 | element shape, key/ref, children merge parity | runtime / parity |
| `react` context | `createContext`, `useContext`, `Consumer` | 필수 | provider override, default fallback, 최신 값 전파 | runtime / integration |
| `react` class | `Component`, `PureComponent`, lifecycle, error boundary | 필수 | lifecycle order, shallow compare, boundary recovery | runtime / parity |
| `react` hooks | `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback` | 필수 | state queue, dependency semantics, identity | runtime |
| special hook | `use` | 필수 | Promise/context read, conditional/loop 허용, try/catch 금지 | parity |
| special hook | `useEffectEvent` | 필수 | 최신 값 관찰, 일반 callback과 구분 | runtime / parity |
| special hook | `useOptimistic` | 필수 | optimistic overlay, reset order | runtime / integration |
| special hook | `useActionState` | 필수 | pending, success/error 순서, `permalink` | integration / parity |
| external store | `useSyncExternalStore` | 필수 | subscribe/unsubscribe, `getServerSnapshot` | runtime / hydration |
| diagnostics | `captureOwnerStack` | 완화 | dev-only 가용성, production 비활성화, 의미 보존 | dev / parity |
| test flush | `act` | 필수 | async 우선, sync 호환, effect/microtask drain, env flag | test harness / parity |
| visibility | `Activity` | 필수 | hidden state 보존, ref/effect 순서, visible restore | integration / parity |
| `react-dom` DOM | `createPortal`, `flushSync` | 필수 | portal propagation, sync flush boundary | renderer-dom / parity |
| resources | `preconnect`, `prefetchDNS`, `preinit`, `preload` 계열 | 필수 | dedupe, option handling, host reflection | renderer-dom / server |
| form status | `useFormStatus` | 필수 | nearest parent form, nullable fields, concurrent submit | integration |
| client root | `createRoot`, `hydrateRoot` | 필수 | root lifecycle, option handlers, hydration start | client / parity |
| root error options | `onCaughtError`, `onUncaughtError`, `onRecoverableError` | 필수 | 분류와 호출 시점 parity | client / diagnostics |
| hydration prop | `suppressHydrationWarning` | 필수 | one-level escape hatch | hydration / parity |
| DOM form semantics | `value`, `checked`, `defaultValue`, `formAction` | 필수 | controlled/uncontrolled, submit path, nearest form | renderer-dom / integration |
| server string | `renderToString`, `renderToStaticMarkup` | 필수 | output parity, option handling | server |
| server stream | `renderToReadableStream`, `renderToPipeableStream` | 필수 | `allReady`, `pipe`, `abort`, shell/all-ready callbacks | server / parity |
| resume | `resume`, `resumeToPipeableStream` | 필수 | postponed state lifecycle, output continuity | server / hydration |
| static | `prerender`, `prerenderToNodeStream` | 필수 | `prelude`, postponed state, abort | static |
| warning text | dev warning 문자열 byte 일치 | 완화 | 의미, 종류, 시점 일치 | diagnostics |
| profiler values | `actualDuration`, `baseDuration` 등의 수치 완전 일치 | 완화 | phase와 상대 의미, 허용 오차 | profiler parity |
| IME/caret/selection | 브라우저별 미세 semantics | 완화 | 일반 입력 흐름 parity | browser integration |
| rare event mapping | 희귀 synthetic event 100% 매핑 | 완화 | 일반 앱 핵심 이벤트 parity | browser parity |
| RSC | Server Components | 비범위 | 해당 없음 | 해당 없음 |
| Server Functions | action transport 전체 | 비범위 | 해당 없음 | 해당 없음 |
| React Native | native renderer | 비범위 | 해당 없음 | 해당 없음 |
| Compiler | React Compiler directives / output | 비범위 | 해당 없음 | 해당 없음 |
| private internals | undocumented fields | 비범위 | 해당 없음 | 해당 없음 |

## 4. 구현 우선순위

1. client root, runtime-core, renderer-dom
2. hydration, StrictMode, diagnostics, form action
3. server / static / resume
4. Activity, Profiler, resource APIs
5. 완화 범위의 브라우저별 미세 동작 조정

## 5. 문서 연결

- 범위와 승인 기준: `requirements.md`
- 구조와 계층 책임: `architecture.md`
- 공개 API 계약: `api-spec.md`
- 테스트 환경과 실행 매트릭스: `test-strategy.md`
- SSR / streaming 세부 계약: `ssr-streaming-spec.md`
