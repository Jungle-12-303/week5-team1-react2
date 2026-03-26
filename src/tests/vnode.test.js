/*
 * Responsibility:
 * - vnode 생성, children normalization, key/event 분리 규칙을 검증한다.
 */

import { h } from "../core/vnode/h.js";
import { createTextVNode } from "../core/vnode/index.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runVnodeTests() {
  return [
    runCase("create text vnode", () => {
      const vnode = createTextVNode("hello");

      if (vnode.type !== "text" || vnode.text !== "hello") {
        throw new Error("Expected text vnode.");
      }
    }),
    runCase("normalize primitive child", () => {
      const vnode = h("div", null, "hello");

      if (vnode.children.length !== 1 || vnode.children[0].type !== "text") {
        throw new Error("Expected primitive child to become text vnode.");
      }
    }),
    runCase("flatten nested children arrays", () => {
      const vnode = h("div", null, ["A", ["B", "C"]]);

      if (vnode.children.length !== 3) {
        throw new Error("Expected nested arrays to be flattened.");
      }
    }),
    runCase("ignore null and false children", () => {
      const vnode = h("div", null, null, false, "A");

      if (vnode.children.length !== 1) {
        throw new Error("Expected null and false children to be ignored.");
      }
    }),
    runCase("extract key and events from props", () => {
      const handler = () => {};
      const vnode = h("button", { key: "save", onClick: handler, className: "primary" }, "Save");

      if (vnode.key !== "save") {
        throw new Error("Expected key to be promoted to the top-level vnode field.");
      }

      if (vnode.events.click !== handler) {
        throw new Error("Expected onClick to become events.click.");
      }

      if (vnode.props.key !== undefined) {
        throw new Error("Expected key to be removed from props.");
      }
    }),
  ];
}
