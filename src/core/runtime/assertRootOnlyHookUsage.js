/*
 * Responsibility:
 * - Hook이 루트 렌더 본문에서만 사용되도록 강제한다.
 */

import { areHooksAllowed } from "./currentDispatcher.js";

export function assertRootOnlyHookUsage() {
  // 활성 루트가 존재하더라도, 지금이 자식 resolver 구간이면 Hook 사용은 금지한다.
  if (!areHooksAllowed()) {
    throw new Error("Hooks are only supported in the root component render.");
  }
}
