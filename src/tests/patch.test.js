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
  ];
}
