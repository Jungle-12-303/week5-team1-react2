/*
 * Responsibility:
 * - patch 적용 로직을 브라우저 DOM 환경에서 검증한다.
 */

import { h } from "../core/vnode/h.js";
import { applyPatches } from "../core/renderer-dom/patch.js";
import { createDomFromVNode } from "../core/renderer-dom/createDom.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runPatchTests() {
  if (typeof document === "undefined") {
    return [{ name: "patch tests", passed: true, skipped: true }];
  }

  return [
    runCase("apply SET_TEXT patch", () => {
      const vnode = h("div", null, "A");
      const root = createDomFromVNode(vnode);
      applyPatches(root, [{ type: "SET_TEXT", path: [0], value: "B" }]);

      if (root.textContent !== "B") {
        throw new Error("Expected text content to update.");
      }
    }),
    runCase("apply SET_PROP patch", () => {
      const vnode = h("div", { className: "a" }, "A");
      const root = createDomFromVNode(vnode);
      applyPatches(root, [{ type: "SET_PROP", path: [], name: "className", value: "b" }]);

      if (root.className !== "b") {
        throw new Error("Expected className to update.");
      }
    }),
    runCase("apply INSERT_CHILD patch", () => {
      const vnode = h("ul", null, h("li", null, "A"));
      const root = createDomFromVNode(vnode);
      applyPatches(root, [
        { type: "INSERT_CHILD", path: [], index: 1, node: h("li", null, "B") },
      ]);

      if (root.childNodes.length !== 2 || root.textContent !== "AB") {
        throw new Error("Expected child node insertion.");
      }
    }),
    runCase("apply REMOVE_CHILD patch", () => {
      const vnode = h("ul", null, h("li", null, "A"), h("li", null, "B"));
      const root = createDomFromVNode(vnode);
      applyPatches(root, [{ type: "REMOVE_CHILD", path: [], index: 1 }]);

      if (root.childNodes.length !== 1 || root.textContent !== "A") {
        throw new Error("Expected child node removal.");
      }
    }),
    runCase("apply multiple REMOVE_CHILD patches from the end of the same parent", () => {
      const vnode = h("ul", null, h("li", null, "A"), h("li", null, "B"), h("li", null, "C"), h("li", null, "D"));
      const root = createDomFromVNode(vnode);
      applyPatches(root, [
        { type: "REMOVE_CHILD", path: [], index: 1 },
        { type: "REMOVE_CHILD", path: [], index: 3 },
      ]);

      if (root.childNodes.length !== 2 || root.textContent !== "AC") {
        throw new Error("Expected multiple child removals to keep indices stable.");
      }
    }),
    runCase("apply REMOVE_CHILD before INSERT_CHILD for the same parent to avoid deleting the replacement", () => {
      const vnode = h("ul", null, h("li", { key: "old" }, "A"));
      const root = createDomFromVNode(vnode);
      applyPatches(root, [
        { type: "INSERT_CHILD", path: [], index: 0, node: h("li", { key: "next" }, "B") },
        { type: "REMOVE_CHILD", path: [], index: 0 },
      ]);

      if (root.childNodes.length !== 1 || root.textContent !== "B") {
        throw new Error(`Expected replacement ordering to leave only the inserted child, received ${root.textContent}.`);
      }
    }),
  ];
}
