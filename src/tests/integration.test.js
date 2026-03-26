/*
 * Responsibility:
 * - engine과 history가 함께 동작하는 주요 통합 흐름을 검증한다.
 */

import { h } from "../core/vnode/h.js";
import { createEngine } from "../core/engine/createEngine.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runIntegrationTests() {
  if (typeof document === "undefined") {
    return [{ name: "integration tests", passed: true, skipped: true }];
  }

  return [
    runCase("patch -> undo -> redo flow", () => {
      const root = document.createElement("div");
      const initialVNode = h("div", null, "A");
      const engine = createEngine({ root, initialVNode });

      engine.render(initialVNode);
      engine.patch(h("div", null, "B"));
      engine.undo();
      engine.redo();

      if (root.textContent !== "B") {
        throw new Error("Expected integration flow to end at B.");
      }
    }),
    runCase("undo followed by patch clears redo path", () => {
      const root = document.createElement("div");
      const initialVNode = h("div", null, "A");
      const engine = createEngine({ root, initialVNode });

      engine.render(initialVNode);
      engine.patch(h("div", null, "B"));
      engine.patch(h("div", null, "C"));
      engine.undo();
      engine.patch(h("div", null, "D"));

      if (engine.getHistory().entries.at(-1).children[0].text !== "D") {
        throw new Error("Expected new patch to replace the redo branch.");
      }
    }),
  ];
}
