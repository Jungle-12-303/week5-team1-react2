/*
 * Responsibility:
 * - dependency 기반 계산값 캐시 Hook을 제공한다.
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
    slot = {
      kind: "memo",
      deps,
      value: factory(),
    };
    component.hooks[hookIndex] = slot;
  } else if (slot.kind !== "memo") {
    throw new Error(`Hook order mismatch at slot ${hookIndex}. Expected useMemo.`);
  } else if (!areHookDepsEqual(slot.deps, deps)) {
    slot.value = factory();
    slot.deps = deps;
  }

  component.hookCursor += 1;

  return slot.value;
}
