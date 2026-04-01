/*
 * Responsibility:
 * - DOM 반영 이후 실행되는 effect Hook을 제공한다.
 *
 * Easy explanation:
 * - useEffect는 "화면이 그려진 뒤에 실행할 일"을 등록하는 Hook이다.
 * - 예를 들면 document.title 변경, localStorage 저장, 로그 출력 같은 후처리가 여기에 들어간다.
 */

import { assertActiveDispatcher } from "../assertActiveDispatcher.js";
import { assertRootOnlyHookUsage } from "../assertRootOnlyHookUsage.js";
import { areHookDepsEqual } from "../areHookDepsEqual.js";

function shouldRunEffect(slot, nextDeps) {
  // 첫 렌더이거나 deps 비교가 불가능하면 effect를 실행한다.
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

  // effect는 render 중 즉시 실행하지 않는다.
  // 우선 "이번 commit 뒤에 실행이 필요한가?"만 판단해 pendingEffects에 기록한다.
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
    // commitEffects()가 이 인덱스를 나중에 읽어 실제 effect를 실행한다.
    component.pendingEffects.push(hookIndex);
  }

  component.hookCursor += 1;
}
