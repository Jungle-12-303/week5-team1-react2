/*
 * Responsibility:
 * - dependency 기반 계산값 캐시 Hook을 제공한다.
 *
 * Easy explanation:
 * - useMemo는 반복 계산을 줄이기 위한 캐시다.
 * - 이전에 계산한 값이 아직 유효하면 다시 계산하지 않고 그대로 재사용한다.
 */

import { assertActiveDispatcher } from "../assertActiveDispatcher.js";
import { assertRootOnlyHookUsage } from "../assertRootOnlyHookUsage.js";
import { areHookDepsEqual } from "../areHookDepsEqual.js";

export function useMemo(factory, deps) {
  const component = assertActiveDispatcher();
  assertRootOnlyHookUsage();

  if (typeof factory !== "function") {
    throw new Error("useMemo requires a factory function.");
  }

  const hookIndex = component.hookCursor;

  if (component.expectedHookCount !== null && hookIndex >= component.expectedHookCount) {
    throw new Error("Hook count changed between renders.");
  }

  let slot = component.hooks[hookIndex];

  if (!slot) {
    // memo도 Hook 슬롯 안에 저장된다. 단, setter 대신 계산 결과를 들고 있다.
    slot = {
      kind: "memo",
      deps,
      value: factory(),
    };
    component.hooks[hookIndex] = slot;
  } else if (slot.kind !== "memo") {
    throw new Error(`Hook order mismatch at slot ${hookIndex}. Expected useMemo.`);
  } else if (!areHookDepsEqual(slot.deps, deps)) {
    // deps가 바뀐 경우에만 다시 계산한다.
    slot.value = factory();
    slot.deps = deps;
  }

  component.hookCursor += 1;

  return slot.value;
}
