/*
 * Responsibility:
 * - inspectEngine이 engine 상태를 발표/디버깅에 필요한 형태로 노출하는지 검증한다.
 */

import { inspectEngine } from "../core/engine/inspect.js";
import { h } from "../core/vnode/h.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runInspectTests() {
  return [
    runCase("inspect engine exposes diff mode and patch count", () => {
      const currentVNode = h("div", null, "A");
      const patchList = [{ type: "SET_TEXT", path: [0], value: "B" }];
      const result = inspectEngine({
        currentVNode,
        history: { entries: [currentVNode], currentIndex: 0 },
        diffMode: "auto",
        lastPatches: patchList,
      });

      if (result.diffMode !== "auto") {
        throw new Error("Expected inspect result to include diff mode.");
      }

      if (result.patchCount !== 1) {
        throw new Error("Expected inspect result to include last patch count.");
      }
    }),
    runCase("inspect engine preserves current vnode reference", () => {
      const currentVNode = h("section", { className: "sample" }, "Demo");
      const result = inspectEngine({
        currentVNode,
        history: { entries: [currentVNode], currentIndex: 0 },
        diffMode: "keyed",
        lastPatches: [],
      });

      if (result.currentVNode !== currentVNode) {
        throw new Error("Expected inspect result to expose the current vnode.");
      }
    }),
  ];
}
