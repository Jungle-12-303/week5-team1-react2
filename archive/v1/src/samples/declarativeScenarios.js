/*
 * Responsibility:
 * - HTML 편집기로 표현하기 어려운 key/event 중심 시나리오를 선언형 fixture로 제공한다.
 * - demo와 tests가 동일한 시나리오 설명을 재사용할 수 있도록 최소 데이터만 노출한다.
 */

import { h } from "../core/vnode/h.js";

function createLogButton(label, handler) {
  return h("button", { className: "demo-button", onClick: handler }, label);
}

export const DECLARATIVE_SCENARIOS = [
  {
    name: "explicit-keyed-reorder",
    label: "Explicit Keyed Reorder",
    labelKey: "scenario.explicit-keyed-reorder.label",
    type: "declarative",
    description: "Use declarative VNodes to emphasize keyed list identity and MOVE_CHILD patches.",
    descriptionKey: "scenario.explicit-keyed-reorder.description",
    recommendedMode: "keyed",
    initialVNode: h(
      "section",
      { className: "scenario-block", "data-scenario": "explicit-keyed-reorder" },
      h("h2", null, "Keyed Reorder"),
      h(
        "ul",
        { className: "items" },
        h("li", { key: "a" }, "Alpha"),
        h("li", { key: "b" }, "Beta"),
        h("li", { key: "c" }, "Gamma")
      )
    ),
    nextVNode: h(
      "section",
      { className: "scenario-block", "data-scenario": "explicit-keyed-reorder" },
      h("h2", null, "Keyed Reorder"),
      h(
        "ul",
        { className: "items" },
        h("li", { key: "c" }, "Gamma"),
        h("li", { key: "a" }, "Alpha"),
        h("li", { key: "b" }, "Beta")
      )
    ),
  },
  {
    name: "event-handler-change",
    label: "Event Handler Change",
    labelKey: "scenario.event-handler-change.label",
    type: "declarative",
    description: "Patch a button label and its click handler to demonstrate SET_EVENT support.",
    descriptionKey: "scenario.event-handler-change.description",
    recommendedMode: "auto",
    initialVNode: h(
      "section",
      { className: "scenario-block", "data-scenario": "event-handler-change" },
      h("h2", null, "Event Patch"),
      createLogButton("Save Draft", () => window.console.log("draft")),
      h("p", null, "Initial button uses the draft click handler.")
    ),
    nextVNode: h(
      "section",
      { className: "scenario-block", "data-scenario": "event-handler-change" },
      h("h2", null, "Event Patch"),
      createLogButton("Publish", () => window.console.log("publish")),
      h("p", null, "Patched button now uses the publish click handler.")
    ),
  },
];
