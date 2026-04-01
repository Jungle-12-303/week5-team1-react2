/*
 * Responsibility:
 * - inspectEngine과 createApp.inspect가 발표/디버깅에 필요한 정보를 노출하는지 검증한다.
 */

import { inspectEngine } from "../core/engine/inspect.js";
import { h } from "../core/vnode/h.js";
import { createApp, useState } from "../index.js";

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
    runCase("inspect engine exposes diff mode plus last and total patch counts", () => {
      const currentVNode = h("div", null, "A");
      const patchList = [{ type: "SET_TEXT", path: [0], value: "B" }];
      const result = inspectEngine({
        currentVNode,
        history: { entries: [currentVNode], currentIndex: 0 },
        diffMode: "auto",
        lastPatches: patchList,
        totalPatchCount: 4,
      });

      if (result.diffMode !== "auto") {
        throw new Error("Expected inspect result to include diff mode.");
      }

      if (result.patchCount !== 1 || result.lastRenderPatchCount !== 1) {
        throw new Error("Expected inspect result to include last patch count.");
      }

      if (result.totalPatchCount !== 4) {
        throw new Error("Expected inspect result to include cumulative patch count.");
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
    runCase("createApp inspect includes hook and engine metadata", () => {
      const root = document.createElement("div");

      function App() {
        const [count] = useState(3);
        return h("div", null, String(count));
      }

      const app = createApp({ root, component: App });
      app.mount();
      const result = app.inspect();

      if (!Array.isArray(result.hooks) || result.hooks.length !== 1) {
        throw new Error("Expected createApp inspect to expose hook slots.");
      }

      if (result.engine.patchCount !== 0 || result.engine.lastRenderPatchCount !== 0) {
        throw new Error("Expected engine inspect metadata to be nested in createApp inspect.");
      }

      if (!Array.isArray(result.engine.patchLabels)) {
        throw new Error("Expected engine inspect metadata to expose patch labels.");
      }

      if (result.totalPatchCount !== 0) {
        throw new Error("Expected createApp inspect to expose cumulative patch metadata.");
      }
    }),
  ];
}
