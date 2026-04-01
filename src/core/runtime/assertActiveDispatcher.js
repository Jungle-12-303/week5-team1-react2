/*
 * Responsibility:
 * - Hook 호출 시 활성 루트 컴포넌트가 있는지 검증한다.
 */

import { getCurrentComponent } from "./currentDispatcher.js";

export function assertActiveDispatcher() {
  // useState/useEffect/useMemo는 자신이 연결될 루트 컴포넌트를 알아야 한다.
  // 이 검사가 통과해야만 "어느 hooks 배열의 몇 번째 슬롯을 쓸지" 결정할 수 있다.
  const component = getCurrentComponent();

  if (!component) {
    throw new Error("Hooks can only be called during the root component render.");
  }

  return component;
}
