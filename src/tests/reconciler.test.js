/*
 * Responsibility:
 * - diff 알고리즘의 핵심 케이스와 diff mode 차이를 검증한다.
 */

import { h } from "../core/vnode/h.js";
import { diff } from "../core/reconciler/diff.js";
import { PATCH_TYPES } from "../core/reconciler/patchTypes.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

function typesOf(patches) {
  return patches.map((patch) => patch.type);
}

export function runReconcilerTests() {
  return [
    runCase("detect text change", () => {
      const oldVNode = h("div", null, "A");
      const newVNode = h("div", null, "B");
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.SET_TEXT)) {
        throw new Error("Expected SET_TEXT patch.");
      }
    }),
    runCase("detect prop change", () => {
      const oldVNode = h("div", { className: "a" });
      const newVNode = h("div", { className: "b" });
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.SET_PROP)) {
        throw new Error("Expected SET_PROP patch.");
      }
    }),
    runCase("detect child insertion", () => {
      const oldVNode = h("ul", null, h("li", null, "A"));
      const newVNode = h("ul", null, h("li", null, "A"), h("li", null, "B"));
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.INSERT_CHILD)) {
        throw new Error("Expected INSERT_CHILD patch.");
      }
    }),
    runCase("detect child removal", () => {
      const oldVNode = h("ul", null, h("li", null, "A"), h("li", null, "B"));
      const newVNode = h("ul", null, h("li", null, "A"));
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.REMOVE_CHILD)) {
        throw new Error("Expected REMOVE_CHILD patch.");
      }
    }),
    runCase("detect node replacement when tag changes", () => {
      const oldVNode = h("div", null, "A");
      const newVNode = h("span", null, "A");
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.REPLACE_NODE)) {
        throw new Error("Expected REPLACE_NODE patch.");
      }
    }),
    runCase("detect event patch", () => {
      const oldVNode = h("button", { onClick: () => "a" }, "Push");
      const newVNode = h("button", { onClick: () => "b" }, "Push");
      const patches = diff(oldVNode, newVNode);

      if (!typesOf(patches).includes(PATCH_TYPES.SET_EVENT)) {
        throw new Error("Expected SET_EVENT patch.");
      }
    }),
    runCase("auto mode uses keyed move for keyed reorder", () => {
      const oldVNode = h(
        "ul",
        null,
        h("li", { key: "a" }, "A"),
        h("li", { key: "b" }, "B"),
        h("li", { key: "c" }, "C")
      );
      const newVNode = h(
        "ul",
        null,
        h("li", { key: "c" }, "C"),
        h("li", { key: "a" }, "A"),
        h("li", { key: "b" }, "B")
      );
      const patches = diff(oldVNode, newVNode, { mode: "auto" });

      if (!typesOf(patches).includes(PATCH_TYPES.MOVE_CHILD)) {
        throw new Error("Expected auto mode to emit MOVE_CHILD for keyed reorder.");
      }
    }),
    runCase("index mode falls back to non-move patches", () => {
      const oldVNode = h(
        "ul",
        null,
        h("li", { key: "a" }, "A"),
        h("li", { key: "b" }, "B"),
        h("li", { key: "c" }, "C")
      );
      const newVNode = h(
        "ul",
        null,
        h("li", { key: "c" }, "C"),
        h("li", { key: "a" }, "A"),
        h("li", { key: "b" }, "B")
      );
      const patches = diff(oldVNode, newVNode, { mode: "index" });

      if (typesOf(patches).includes(PATCH_TYPES.MOVE_CHILD)) {
        throw new Error("Expected index mode not to emit MOVE_CHILD.");
      }
    }),
    runCase("explicit keyed mode emits move patch", () => {
      const oldVNode = h(
        "ul",
        null,
        h("li", { key: "a" }, "A"),
        h("li", { key: "b" }, "B")
      );
      const newVNode = h(
        "ul",
        null,
        h("li", { key: "b" }, "B"),
        h("li", { key: "a" }, "A")
      );
      const patches = diff(oldVNode, newVNode, { mode: "keyed" });

      if (!typesOf(patches).includes(PATCH_TYPES.MOVE_CHILD)) {
        throw new Error("Expected explicit keyed mode to emit MOVE_CHILD.");
      }
    }),
  ];
}
