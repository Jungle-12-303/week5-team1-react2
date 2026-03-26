/*
 * Responsibility:
 * - HTML 기반 시연 시나리오에서 사용할 초기/목표 마크업 샘플을 제공한다.
 * - demo layer가 부트스트랩, reset, scenario 전환에 사용할 데이터만 보관한다.
 */

export const INITIAL_HTML = `<div class="sample-root">
  <h1 data-title="demo">Virtual DOM Demo</h1>
  <p class="description">Edit the test panel and apply patches.</p>
  <ul class="items">
    <li key="a">Alpha</li>
    <li key="b">Beta</li>
    <li key="c">Gamma</li>
  </ul>
  <input type="text" value="hello" />
</div>`;

export const HTML_SCENARIOS = [
  {
    name: "playground",
    label: "Playground",
    labelKey: "scenario.playground.label",
    type: "html",
    description: "Start from the same actual/test state and edit the target HTML freely.",
    descriptionKey: "scenario.playground.description",
    initialHtml: INITIAL_HTML,
    targetHtml: INITIAL_HTML,
  },
  {
    name: "list-reorder",
    label: "List Reorder",
    labelKey: "scenario.list-reorder.label",
    type: "html",
    description: "Reorder keyed list items to compare auto, index, and keyed diff modes.",
    descriptionKey: "scenario.list-reorder.description",
    initialHtml: INITIAL_HTML,
    targetHtml: `<div class="sample-root">
  <h1 data-title="demo">Virtual DOM Demo</h1>
  <p class="description">Edit the test panel and apply patches.</p>
  <ul class="items">
    <li key="a">Alpha</li>
    <li key="c">Gamma</li>
    <li key="b">Beta</li>
  </ul>
  <input type="text" value="hello" />
</div>`,
    recommendedMode: "auto",
  },
  {
    name: "text-and-prop-change",
    label: "Text + Prop Change",
    labelKey: "scenario.text-and-prop-change.label",
    type: "html",
    description: "Update text, className, and attribute values without replacing the whole subtree.",
    descriptionKey: "scenario.text-and-prop-change.description",
    initialHtml: INITIAL_HTML,
    targetHtml: `<div class="sample-root updated" data-state="patched">
  <h1 data-title="demo">Virtual DOM Engine</h1>
  <p class="description">Only the changed parts should be patched.</p>
  <ul class="items">
    <li key="a">Alpha</li>
    <li key="b">Beta</li>
    <li key="c">Gamma</li>
  </ul>
  <input type="text" value="patched" />
</div>`,
    recommendedMode: "auto",
  },
];
