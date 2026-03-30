/*
 * Responsibility:
 * - DOM 반영 이후 실행되는 effect Hook을 제공한다.
 */

import { assertActiveDispatcher } from "../assertActiveDispatcher.js";
import { assertRootOnlyHookUsage } from "../assertRootOnlyHookUsage.js";
import { areHookDepsEqual } from "../areHookDepsEqual.js";

function shouldRunEffect(slot, nextDeps) {
  if (!slot) {
    return true;
  }

  if (!Array.isArray(nextDeps) || !Array.isArray(slot.deps)) {
    return true;
  }

  return !areHookDepsEqual(slot.deps, nextDeps);
}

export function useEffect(create, deps) {
  const component = assertActiveDispatcher();
  assertRootOnlyHookUsage();

  if (typeof create !== "function") {
    throw new Error("useEffect requires a function.");
  }

  const hookIndex = component.hookCursor;

  if (component.expectedHookCount !== null && hookIndex >= component.expectedHookCount) {
    throw new Error("Hook count changed between renders.");
  }

  let slot = component.hooks[hookIndex];

  const mustRun = shouldRunEffect(slot, deps);

  if (!slot) {
    slot = {
      kind: "effect",
      create,
      deps: undefined,
      nextDeps: deps,
      cleanup: null,
    };
    component.hooks[hookIndex] = slot;
  }

  if (slot.kind !== "effect") {
    throw new Error(`Hook order mismatch at slot ${hookIndex}. Expected useEffect.`);
  }

  slot.create = create;
  slot.nextDeps = deps;

  if (mustRun) {
    component.pendingEffects.push(hookIndex);
  }

  component.hookCursor += 1;
}
