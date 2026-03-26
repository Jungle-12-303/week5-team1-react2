/*
 * Responsibility:
 * - 시연 페이지의 전체 상태 흐름을 orchestration 한다.
 * - 문서에 정의된 bootstrap, preview, diff, patch, undo/redo, inspect, test 실행 흐름을 연결한다.
 *
 * Detailed logic:
 * - core layer의 public-like function과 engine facade를 사용해 demo layer를 구성한다.
 * - Actual Panel은 engine이, Test Panel/Editor/설명 UI는 demo가 관리한다.
 * - HTML 시나리오는 test panel DOM -> VNode 흐름을 따르고, 선언형 fixture는 VNode를 직접 사용한다.
 */

import { createEngine } from "../core/engine/createEngine.js";
import { diff } from "../core/reconciler/diff.js";
import { createDomFromVNode } from "../core/renderer-dom/createDom.js";
import { domToVNode } from "../core/renderer-dom/domToVNode.js";
import { DIFF_MODES } from "../core/shared/constants.js";
import { createPanels } from "./panels.js";
import { createControls } from "./controls.js";
import { createLogger, formatPatchEntry } from "./logger.js";
import { sanitizeHtml } from "./sanitizeHtml.js";
import { createScenarioRunner } from "./scenarioRunner.js";
import { createTestRunner } from "./testRunner.js";
import { createI18n } from "./i18n.js";
import { HTML_SCENARIOS } from "../samples/initialHtml.js";
import { DECLARATIVE_SCENARIOS } from "../samples/declarativeScenarios.js";
import { runVnodeTests } from "../tests/vnode.test.js";
import { runReconcilerTests } from "../tests/reconciler.test.js";
import { runPatchTests } from "../tests/patch.test.js";
import { runHistoryTests } from "../tests/history.test.js";
import { runEngineTests } from "../tests/engine.test.js";
import { runIntegrationTests } from "../tests/integration.test.js";
import { runUtilsTests } from "../tests/utils.test.js";
import { runInspectTests } from "../tests/inspect.test.js";
import { runI18nTests } from "../tests/i18n.test.js";

const DEMO_STYLES = `
  :root {
    color-scheme: light;
    --bg: linear-gradient(180deg, #f6f4ed 0%, #ece8df 100%);
    --shell: rgba(249, 247, 242, 0.94);
    --stroke: #e4ddd1;
    --shadow: 0 18px 48px rgba(28, 34, 39, 0.09);
    --ink: #18303a;
    --muted: #617078;
    --soft: #8b989e;
    --header-start: #18313b;
    --header-end: #274854;
    --editor: #f3ede3;
    --test: #f6e4cd;
    --actual: #dbe9eb;
    --diff: #dde8f4;
    --patch: #dce9d7;
    --history: #ede4d7;
    --inspect: #e4edf0;
    --accent: #d58a3f;
    --success: #2d5a3c;
    --danger: #8b4337;
    --radius-lg: 28px;
    --radius-md: 18px;
    --radius-sm: 14px;
    --font-ui: "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    --font-code: "Consolas", "Courier New", monospace;
  }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-ui);
  }

  #app {
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }

  .demo-shell {
    max-width: 1480px;
    margin: 0 auto;
    padding: 28px;
    border: 1px solid var(--stroke);
    border-radius: 36px;
    background: var(--shell);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
  }

  .demo-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
    padding: 24px 28px;
    border-radius: 24px;
    background: linear-gradient(135deg, var(--header-start), var(--header-end));
    color: #f7f6f1;
  }

  .demo-title {
    margin: 0;
    font-size: 31px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .demo-subtitle,
  .demo-intro-body,
  .demo-intro-hint,
  .demo-panel-description,
  .demo-editor-hint,
  .demo-log-summary,
  .demo-test-summary,
  .demo-empty-state {
    margin: 0;
    line-height: 1.55;
    color: var(--muted);
  }

  .demo-subtitle {
    margin-top: 8px;
    color: #c9d4d8;
  }

  .demo-header-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .demo-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .demo-badge-mode { background: #e5b06a; color: #472f12; }
  .demo-badge-history { background: #d3e0e4; color: #18303a; }
  .demo-badge-status { background: #bfd8c3; color: #1f4c33; }
  .demo-badge-subtle {
    margin-top: 4px;
    background: rgba(24, 48, 58, 0.08);
    color: var(--muted);
  }

  .demo-intro,
  .demo-stepper,
  .demo-controls-host,
  .demo-panel {
    margin-top: 18px;
    border: 1px solid var(--stroke);
    border-radius: 24px;
    background: rgba(255, 253, 248, 0.84);
  }

  .demo-intro {
    padding: 22px 24px;
  }

  .demo-intro-title,
  .demo-panel-title,
  .demo-test-results-title {
    margin: 0;
    color: var(--ink);
    font-weight: 700;
  }

  .demo-intro-title { font-size: 20px; }

  .demo-intro-body { margin-top: 10px; }
  .demo-intro-hint { margin-top: 6px; color: var(--soft); }

  .demo-stepper {
    padding: 16px 18px;
  }

  .demo-stepper-list {
    display: flex;
    gap: 12px;
    padding: 0;
    margin: 0;
    list-style: none;
    overflow-x: auto;
  }

  .demo-stepper-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 999px;
    background: #f1ece2;
    color: var(--muted);
    white-space: nowrap;
    transition: 0.2s ease;
  }

  .demo-stepper-item.is-active {
    background: #dbe6f3;
    color: #244c74;
  }

  .demo-stepper-item.is-complete {
    background: #d9ead8;
    color: #2f5a3c;
  }

  .demo-stepper-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.8;
  }

  .demo-stepper-label {
    font-size: 13px;
    font-weight: 700;
  }

  .demo-controls {
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(160px, 200px) minmax(260px, 1fr) minmax(420px, 520px);
    gap: 18px;
    padding: 18px;
    align-items: center;
  }

  .demo-control-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .demo-control-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .demo-control-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
  }

  .demo-scenario-select,
  .demo-editor-input {
    width: 100%;
    border: 1px solid var(--stroke);
    border-radius: 16px;
    background: #faf8f4;
    color: var(--ink);
    font: 500 14px var(--font-ui);
    box-sizing: border-box;
  }

  .demo-scenario-select {
    min-height: 42px;
    padding: 0 14px;
  }

  .demo-action-button {
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid #dfd6c9;
    border-radius: 999px;
    background: #f2ede4;
    color: #45535a;
    font: 700 14px var(--font-ui);
    cursor: pointer;
    transition: 0.18s ease;
  }

  .demo-action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(24, 48, 58, 0.08);
  }

  .demo-action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .demo-action-button.is-primary {
    border-color: #d58a3f;
    background: #d58a3f;
    color: #fff8f1;
  }

  .demo-action-button.is-success {
    border-color: #dbe7da;
    background: #e5efe2;
    color: #2d5a3c;
  }

  .demo-action-button.is-danger {
    border-color: #edd7d1;
    background: #f4ddd7;
    color: #8b4337;
  }

  .demo-action-button.is-mode.is-active {
    border-color: #17313b;
    background: #17313b;
    color: #f6f5f0;
  }

  .demo-main-grid,
  .demo-logs-grid,
  .demo-footer-grid {
    display: grid;
    gap: 18px;
    margin-top: 18px;
  }

  .demo-main-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .demo-logs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .demo-footer-grid { grid-template-columns: minmax(320px, 0.9fr) minmax(460px, 1.4fr); }

  .demo-panel {
    padding: 18px;
    overflow: hidden;
  }

  .demo-panel-editor { background: linear-gradient(180deg, rgba(243, 237, 227, 0.7), rgba(255, 253, 248, 0.92)); }
  .demo-panel-test { background: linear-gradient(180deg, rgba(246, 228, 205, 0.62), rgba(255, 253, 248, 0.92)); }
  .demo-panel-actual { background: linear-gradient(180deg, rgba(219, 233, 235, 0.68), rgba(255, 255, 255, 0.96)); }
  .demo-panel-diff { background: linear-gradient(180deg, rgba(221, 232, 244, 0.72), rgba(252, 251, 248, 0.96)); }
  .demo-panel-patch { background: linear-gradient(180deg, rgba(220, 233, 215, 0.72), rgba(251, 252, 248, 0.96)); }
  .demo-panel-history { background: linear-gradient(180deg, rgba(237, 228, 215, 0.62), rgba(252, 251, 248, 0.96)); }
  .demo-panel-inspect { background: linear-gradient(180deg, rgba(228, 237, 240, 0.7), rgba(249, 251, 251, 0.96)); }

  .demo-panel-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .demo-panel-title { font-size: 18px; }

  .demo-panel-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .demo-editor-meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .demo-editor-input {
    min-height: 310px;
    padding: 16px;
    resize: vertical;
    font: 500 13px/1.55 var(--font-code);
    background: #f8f4ec;
  }

  .demo-preview-surface,
  .demo-inspect-view,
  .demo-test-results,
  .demo-history-list {
    min-height: 220px;
    padding: 16px;
    border: 1px solid rgba(24, 48, 58, 0.09);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.78);
    box-sizing: border-box;
    overflow: auto;
  }

  .demo-log-list { min-height: 180px; }

  .demo-log-empty,
  .demo-empty-state {
    padding: 18px;
    border: 1px dashed rgba(24, 48, 58, 0.16);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.72);
  }

  .demo-log-items,
  .demo-test-case-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .demo-log-item,
  .demo-test-case {
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(24, 48, 58, 0.08);
  }

  .demo-log-item.tone-success,
  .demo-test-case.is-passed { border-color: rgba(45, 90, 60, 0.25); }
  .demo-log-item.tone-warn,
  .demo-test-case.is-failed { border-color: rgba(139, 67, 55, 0.25); }

  .demo-log-label,
  .demo-test-case-label {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(24, 48, 58, 0.08);
    color: var(--ink);
    font-size: 12px;
    font-weight: 700;
  }

  .demo-log-detail {
    display: block;
    margin-top: 10px;
    color: #45535a;
    font: 600 12px/1.5 var(--font-code);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .demo-log-summary {
    margin-top: 8px;
  }

  .demo-history-list {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 10px;
    min-height: 180px;
  }

  .demo-history-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: #ede4d7;
    color: #5d5141;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: 0.18s ease;
  }

  .demo-history-chip:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(24, 48, 58, 0.08);
  }

  .demo-history-chip:disabled {
    cursor: default;
  }

  .demo-history-chip.is-current {
    background: #e5b06a;
    color: #3f2a13;
  }

  .demo-inspect-view {
    margin: 0;
    white-space: pre-wrap;
    font: 600 12px/1.6 var(--font-code);
    color: #44525a;
  }

  .demo-test-results-title {
    margin-top: 6px;
    font-size: 16px;
  }

  .demo-test-summary {
    margin-bottom: 12px;
  }

  .demo-test-case-detail {
    margin-top: 8px;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 1240px) {
    .demo-controls { grid-template-columns: 1fr; }
    .demo-main-grid { grid-template-columns: 1fr 1fr; }
    .demo-panel-actual { grid-column: 1 / -1; }
    .demo-footer-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 860px) {
    #app { padding: 16px; }
    .demo-shell { padding: 16px; border-radius: 24px; }
    .demo-header { flex-direction: column; }
    .demo-main-grid,
    .demo-logs-grid,
    .demo-footer-grid { grid-template-columns: 1fr; }
    .demo-editor-input { min-height: 240px; }
  }
`;

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

function ensureDemoStyles(documentRef) {
  if (documentRef.getElementById("virtual-dom-demo-styles")) {
    return;
  }

  const style = documentRef.createElement("style");
  style.id = "virtual-dom-demo-styles";
  style.textContent = DEMO_STYLES;
  documentRef.head.appendChild(style);
}

function getRenderableChildNodes(container) {
  return Array.from(container.childNodes).filter((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      return true;
    }

    return !/^\s*$/.test(node.textContent ?? "");
  });
}

function getSingleRenderableNode(container) {
  const nodes = getRenderableChildNodes(container);

  if (nodes.length === 0) {
    throw new Error("The preview must contain a single root element, but it is empty.");
  }

  if (nodes.length > 1) {
    throw new Error("The preview must contain a single root element.");
  }

  return nodes[0];
}

function renderVNodeIntoContainer(container, vnode) {
  container.replaceChildren(createDomFromVNode(vnode));
}

function serializeVNodeToHtml(vnode, documentRef) {
  const wrapper = documentRef.createElement("div");
  wrapper.appendChild(createDomFromVNode(vnode, documentRef));
  return wrapper.innerHTML;
}

function inspectReplacer(key, value) {
  if (typeof value === "function") {
    return "[Function]";
  }

  return value;
}

function getPatchTone(patch) {
  if (patch.type.startsWith("REMOVE")) {
    return "warn";
  }

  if (patch.type.startsWith("SET") || patch.type.startsWith("INSERT") || patch.type.startsWith("MOVE")) {
    return "success";
  }

  return "neutral";
}

function formatAppliedPatchEntry(patch, t) {
  const base = formatPatchEntry(patch, t);

  return {
    ...base,
    label: t("log.appliedPatch", { type: patch.type }),
    tone: getPatchTone(patch),
  };
}

function createEmptyMessage(message) {
  const element = createElement("p", "demo-empty-state", message);
  return element;
}

function resolveTranslationParams(params, translateMode) {
  if (!params) {
    return {};
  }

  const nextParams = { ...params };

  if (nextParams.modeKey) {
    nextParams.mode = translateMode(nextParams.modeKey);
    delete nextParams.modeKey;
  }

  return nextParams;
}

function buildLogEntry(t, model) {
  const params =
    typeof model.paramsFactory === "function"
      ? model.paramsFactory()
      : resolveTranslationParams(model.params, (mode) => t(`controls.mode.${mode}`));

  return {
    label: model.label ?? t(model.labelKey ?? "log.info", params),
    detail: model.detail ?? "",
    summary:
      model.summary ??
      (model.summaryKey ? t(model.summaryKey, params) : ""),
    tone: model.tone ?? "neutral",
  };
}

export function createDemoApp(options = {}) {
  const root = options.root;
  const documentRef = root?.ownerDocument ?? document;
  const i18n = createI18n(options.language ?? "ko");
  const t = (key, params) => i18n.t(key, params);

  ensureDemoStyles(documentRef);

  const panels = createPanels(root, t);
  const controls = createControls(panels.controlsHost, {
    t,
    languages: i18n.getAvailableLanguages(),
  });
  const diffLogger = createLogger(panels.diffLog, {
    emptyMessage: t("empty.diff"),
  });
  const patchLogger = createLogger(panels.patchLog, {
    emptyMessage: t("empty.patch"),
  });
  const scenarioRunner = createScenarioRunner({
    scenarios: [...HTML_SCENARIOS, ...DECLARATIVE_SCENARIOS],
  });
  const testRunner = createTestRunner({
    suites: [
      { name: "vnode", run: runVnodeTests },
      { name: "reconciler", run: runReconcilerTests },
      { name: "patch", run: runPatchTests },
      { name: "history", run: runHistoryTests },
      { name: "engine", run: runEngineTests },
      { name: "integration", run: runIntegrationTests },
      { name: "utils", run: runUtilsTests },
      { name: "inspect", run: runInspectTests },
      { name: "i18n", run: runI18nTests },
    ],
  });

  const state = {
    activeScenario: null,
    engine: null,
    previewVNode: null,
    previewHtml: "",
    isEditorEnabled: true,
    status: {
      labelKey: "status.previewReady",
      detailKey: "intro.hint",
      params: {},
      stepIndex: 0,
    },
    ui: {
      editorHintKey: "panels.editor.hint",
      editorStateKey: "panels.editor.editable",
      testStateKey: "panels.test.targetPreview",
    },
    diffLogModel: { kind: "empty" },
    patchLogModel: { kind: "empty" },
    lastTestResult: null,
  };

  function resolveScenarioLabel(scenario) {
    return scenario.labelKey ? t(scenario.labelKey) : scenario.label ?? scenario.name;
  }

  function resolveScenarioDescription(scenario) {
    return scenario.descriptionKey ? t(scenario.descriptionKey) : scenario.description ?? "";
  }

  function translateDiffMode(mode) {
    return t(`controls.mode.${mode}`);
  }

  function updateModeBadge(mode) {
    panels.modeBadge.textContent = translateDiffMode(mode);
    controls.setActiveMode(mode);
  }

  function updateStepper(activeIndex) {
    panels.stepItems.forEach((stepItem, index) => {
      stepItem.item.classList.toggle("is-active", index === activeIndex);
      stepItem.item.classList.toggle("is-complete", index < activeIndex);
    });
  }

  function applyCurrentStatus() {
    const params = resolveTranslationParams(state.status.params, translateDiffMode);
    panels.statusBadge.textContent = t(state.status.labelKey, params);
    panels.introHint.textContent = t(state.status.detailKey, params);
    updateStepper(state.status.stepIndex);
  }

  function updateStatus(labelKey, detailKey, activeStepIndex = 0, params = {}) {
    state.status = {
      labelKey,
      detailKey,
      params,
      stepIndex: activeStepIndex,
    };
    applyCurrentStatus();
  }

  function syncLocalizedSurfaceLabels() {
    panels.editorHint.textContent = t(state.ui.editorHintKey);
    panels.editorStateBadge.textContent = t(state.ui.editorStateKey);
    panels.testStateBadge.textContent = t(state.ui.testStateKey);
    panels.actualStateBadge.textContent = t("panels.actual.badge");
  }

  function getHistoryEntryLabel(entry) {
    return entry?.tag ?? entry?.type ?? t("history.snapshot");
  }

  function renderHistory() {
    const history = state.engine?.getHistory();

    panels.historyPanel.textContent = "";

    if (!history) {
      panels.historyPanel.appendChild(createEmptyMessage(t("empty.history")));
      panels.historyBadge.textContent = t("history.badge", { current: 0, total: 0 });
      controls.setHistoryButtonState({ canUndo: false, canRedo: false });
      return;
    }

    panels.historyBadge.textContent = t("history.badge", {
      current: history.currentIndex + 1,
      total: history.entries.length,
    });

    history.entries.forEach((entry, index) => {
      const chip = createElement("button", "demo-history-chip");
      const isCurrent = index === history.currentIndex;
      const label = getHistoryEntryLabel(entry);

      chip.type = "button";
      chip.dataset.historyIndex = String(index);
      chip.disabled = isCurrent;
      chip.setAttribute("aria-pressed", String(isCurrent));
      chip.title = t("history.jumpTitle", {
        index: index + 1,
        label,
      });
      chip.setAttribute(
        "aria-label",
        t("history.jumpLabel", {
          index: index + 1,
          label,
        })
      );
      chip.classList.toggle("is-current", isCurrent);
      chip.textContent = t("history.entry", {
        index: index + 1,
        label,
      });
      panels.historyPanel.appendChild(chip);
    });

    controls.setHistoryButtonState({
      canUndo: history.currentIndex > 0,
      canRedo: history.currentIndex < history.entries.length - 1,
    });
  }

  function renderInspect() {
    if (!state.engine) {
      panels.inspectPanel.textContent = "";
      return;
    }

    panels.inspectPanel.textContent = JSON.stringify(state.engine.inspect(), inspectReplacer, 2);
  }

  function renderTestResults(result) {
    state.lastTestResult = result;
    panels.testResultsPanel.textContent = "";

    if (!result) {
      panels.testResultsPanel.appendChild(createEmptyMessage(t("empty.tests")));
      return;
    }

    const summary = createElement(
      "p",
      "demo-test-summary",
      t("test.summary", {
        suites: result.summary.totalSuites,
        cases: result.summary.totalCases,
        passed: result.summary.passedCount,
        failed: result.summary.failedCount,
        skipped: result.summary.skippedCount,
      })
    );
    const list = createElement("ul", "demo-test-case-list");

    result.flatCases.forEach((testCase) => {
      const item = createElement("li", "demo-test-case");
      const stateClass = testCase.skipped ? "is-skipped" : testCase.passed ? "is-passed" : "is-failed";
      const label = createElement(
        "span",
        `demo-test-case-label ${stateClass}`,
        `${testCase.suite}: ${testCase.name}`
      );
      const detail = createElement(
        "p",
        "demo-test-case-detail",
        testCase.skipped
          ? t("test.skipped.detail")
          : testCase.passed
            ? t("test.passed.detail")
            : testCase.error ?? t("test.failed")
      );

      item.classList.add(stateClass);
      item.appendChild(label);
      item.appendChild(detail);
      list.appendChild(item);
    });

    panels.testResultsPanel.appendChild(summary);
    panels.testResultsPanel.appendChild(list);
  }

  function renderDiffLog() {
    diffLogger.setEmptyMessage(t("empty.diff"));

    if (state.diffLogModel.kind === "empty") {
      diffLogger.clear();
      return;
    }

    if (state.diffLogModel.kind === "patches") {
      diffLogger.setEntries(state.diffLogModel.patches.map((patch) => formatPatchEntry(patch, t)));
      return;
    }

    if (state.diffLogModel.kind === "message") {
      diffLogger.setEntries([buildLogEntry(t, state.diffLogModel)]);
    }
  }

  function setDiffLogModel(model) {
    state.diffLogModel = model;
    renderDiffLog();
  }

  function renderPatchLog() {
    patchLogger.setEmptyMessage(t("empty.patch"));

    if (state.patchLogModel.kind === "empty") {
      patchLogger.clear();
      return;
    }

    if (state.patchLogModel.kind === "appliedPatches") {
      patchLogger.setEntries(
        state.patchLogModel.patches.map((patch) => formatAppliedPatchEntry(patch, t))
      );
      return;
    }

    if (state.patchLogModel.kind === "message") {
      patchLogger.setEntries([buildLogEntry(t, state.patchLogModel)]);
    }
  }

  function setPatchLogModel(model) {
    state.patchLogModel = model;
    renderPatchLog();
  }

  function setPreviewVNode(vnode, detailKey = "status.previewReady.detail") {
    state.previewVNode = vnode;
    renderVNodeIntoContainer(panels.testPanel, vnode);
    updateStatus("status.previewReady", detailKey, 1);
    refreshDiffPreview();
  }

  function readHtmlPreviewVNode() {
    const rootNode = getSingleRenderableNode(panels.testPanel);
    return domToVNode(rootNode);
  }

  function refreshDiffPreview() {
    if (!state.engine || !state.previewVNode) {
      setDiffLogModel({ kind: "empty" });
      return;
    }

    const patches = diff(state.engine.getCurrentVNode(), state.previewVNode, {
      mode: state.engine.getDiffMode(),
    });

    if (patches.length === 0) {
      setDiffLogModel({
        kind: "message",
        labelKey: "log.noChange",
        summaryKey: "log.noChange.summary",
        tone: "neutral",
      });
      return;
    }

    setDiffLogModel({
      kind: "patches",
      patches,
    });
  }

  function syncEditorFromVNode(vnode) {
    const serialized = serializeVNodeToHtml(vnode, documentRef);
    panels.editorInput.value = serialized;
    syncLocalizedSurfaceLabels();
  }

  function syncPreviewAndInspectFromCurrentVNode(statusLabel, statusDetail, stepIndex) {
    const currentVNode = state.engine.getCurrentVNode();
    state.previewVNode = currentVNode;
    renderVNodeIntoContainer(panels.testPanel, currentVNode);
    syncEditorFromVNode(currentVNode);
    renderHistory();
    renderInspect();
    refreshDiffPreview();
    updateStatus(statusLabel, statusDetail, stepIndex);
  }

  function createEngineFromActualPanel(initialVNode, mode) {
    return createEngine({
      root: panels.actualPanel,
      initialVNode,
      diffMode: mode,
    });
  }

  function initializeHtmlScenario(scenario, mode) {
    const initialHtml = sanitizeHtml(scenario.initialHtml);
    panels.actualPanel.innerHTML = initialHtml;

    const initialVNode = domToVNode(getSingleRenderableNode(panels.actualPanel));

    state.engine = createEngineFromActualPanel(initialVNode, mode);
    // Normalize the actual panel to the canonical VNode-driven DOM tree so patch
    // paths do not drift because of whitespace-only text nodes created by innerHTML.
    state.engine.render(initialVNode);
    state.isEditorEnabled = true;
    panels.editorInput.disabled = false;
    state.ui.editorHintKey = "panels.editor.hint";
    state.ui.editorStateKey = "panels.editor.editable";
    state.ui.testStateKey = "panels.test.targetPreview";
    syncLocalizedSurfaceLabels();
    panels.editorInput.value = scenario.targetHtml ?? scenario.initialHtml;

    updateModeBadge(state.engine.getDiffMode());
    renderHistory();
    renderInspect();
    updateHtmlPreview();
  }

  function initializeDeclarativeScenario(scenario, mode) {
    state.engine = createEngineFromActualPanel(scenario.initialVNode, mode);
    state.engine.render(scenario.initialVNode);
    state.isEditorEnabled = false;
    panels.editorInput.disabled = true;
    state.ui.editorHintKey = "declarative.hint";
    state.ui.editorStateKey = "panels.editor.fixture";
    state.ui.testStateKey = "panels.test.targetFixture";
    syncLocalizedSurfaceLabels();

    syncEditorFromVNode(scenario.nextVNode);
    updateModeBadge(state.engine.getDiffMode());
    renderHistory();
    renderInspect();
    setPreviewVNode(scenario.nextVNode);
  }

  function loadScenario(name) {
    const scenario = scenarioRunner.getByName(name);

    if (!scenario) {
      return;
    }

    state.activeScenario = scenario;
    panels.introBody.textContent = resolveScenarioDescription(scenario);

    const scenarioMode = scenario.recommendedMode ?? state.engine?.getDiffMode() ?? DIFF_MODES.AUTO;

    if (scenario.type === "declarative") {
      initializeDeclarativeScenario(scenario, scenarioMode);
    } else {
      initializeHtmlScenario(scenario, scenarioMode);
    }

    setPatchLogModel({
      kind: "message",
      labelKey: "log.scenario",
      summaryKey: "log.scenario.summary",
      paramsFactory: () => ({
        label: resolveScenarioLabel(state.activeScenario ?? scenario),
      }),
      tone: "neutral",
    });
  }

  function updateHtmlPreview() {
    if (!state.activeScenario || state.activeScenario.type !== "html") {
      return;
    }

    const sanitizedHtml = sanitizeHtml(panels.editorInput.value);

    try {
      panels.testPanel.innerHTML = sanitizedHtml;
      state.previewVNode = readHtmlPreviewVNode();
      state.previewHtml = sanitizedHtml;
      state.ui.testStateKey =
        sanitizedHtml === panels.editorInput.value
          ? "panels.test.targetPreview"
          : "panels.test.sanitizedPreview";
      syncLocalizedSurfaceLabels();
      updateStatus("status.previewReady", "status.previewReady.detail", 1);
      controls.setEditorDependentActions(false);
      refreshDiffPreview();
      renderInspect();
    } catch (error) {
      state.previewVNode = null;
      setDiffLogModel({
        kind: "message",
        labelKey: "log.previewError",
        summary: error.message,
        tone: "warn",
      });
      setPatchLogModel({ kind: "empty" });
      controls.setEditorDependentActions(true);
      updateStatus("status.previewError", "status.previewError.detail", 0);
    }
  }

  function readNextVNodeForPatch() {
    if (!state.activeScenario) {
      throw new Error("No active scenario is loaded.");
    }

    if (state.activeScenario.type === "declarative") {
      return state.previewVNode;
    }

    return readHtmlPreviewVNode();
  }

  function applyPatch() {
    if (!state.engine) {
      return;
    }

    const nextVNode = readNextVNodeForPatch();
    const patches = diff(state.engine.getCurrentVNode(), nextVNode, {
      mode: state.engine.getDiffMode(),
    });

    if (patches.length === 0) {
      setPatchLogModel({
        kind: "message",
        labelKey: "log.noPatch",
        summaryKey: "log.noPatch.summary",
        tone: "neutral",
      });
      updateStatus("status.synced", "status.synced.detail", 2);
      return;
    }

    const result = state.engine.patch(nextVNode);

    setPatchLogModel({
      kind: "appliedPatches",
      patches: result.patches,
    });
    renderHistory();
    renderInspect();
    syncEditorFromVNode(result.currentVNode);
    renderVNodeIntoContainer(panels.testPanel, result.currentVNode);
    state.previewVNode = result.currentVNode;
    refreshDiffPreview();
    updateStatus("status.patched", "status.patched.detail", 3);
  }

  function moveHistory(direction) {
    if (!state.engine) {
      return;
    }

    const result = direction === "undo" ? state.engine.undo() : state.engine.redo();

    if (!result.moved) {
      setPatchLogModel({
        kind: "message",
        labelKey: direction === "undo" ? "log.undoLimit" : "log.redoLimit",
        summaryKey: direction === "undo" ? "log.undoLimit.summary" : "log.redoLimit.summary",
        tone: "neutral",
      });
      updateStatus(direction === "undo" ? "status.undoLimit" : "status.redoLimit", "status.limit.detail", 4);
      return;
    }

    syncPreviewAndInspectFromCurrentVNode(
      direction === "undo" ? "status.undoApplied" : "status.redoApplied",
      direction === "undo" ? "status.undoApplied.detail" : "status.redoApplied.detail",
      4
    );
    setPatchLogModel({
      kind: "message",
      labelKey: direction === "undo" ? "log.undo" : "log.redo",
      summaryKey: direction === "undo" ? "log.undo.summary" : "log.redo.summary",
      tone: "success",
    });
  }

  function moveHistoryToIndex(targetIndex) {
    if (!state.engine) {
      return;
    }

    const history = state.engine.getHistory();

    if (!history || targetIndex === history.currentIndex) {
      return;
    }

    const isUndoDirection = targetIndex < history.currentIndex;
    const move = isUndoDirection ? () => state.engine.undo() : () => state.engine.redo();
    const totalSteps = Math.abs(targetIndex - history.currentIndex);
    let movedSteps = 0;
    let lastResult = null;

    for (let step = 0; step < totalSteps; step += 1) {
      lastResult = move();

      if (!lastResult.moved) {
        break;
      }

      movedSteps += 1;
    }

    if (!lastResult?.moved && movedSteps === 0) {
      setPatchLogModel({
        kind: "message",
        labelKey: isUndoDirection ? "log.undoLimit" : "log.redoLimit",
        summaryKey: isUndoDirection ? "log.undoLimit.summary" : "log.redoLimit.summary",
        tone: "neutral",
      });
      updateStatus(isUndoDirection ? "status.undoLimit" : "status.redoLimit", "status.limit.detail", 4);
      return;
    }

    const currentHistory = state.engine.getHistory();
    const currentEntry = currentHistory.entries[currentHistory.currentIndex];

    syncPreviewAndInspectFromCurrentVNode("status.historyJumped", "status.historyJumped.detail", 4);
    setPatchLogModel({
      kind: "message",
      labelKey: "log.historyJump",
      summaryKey: "log.historyJump.summary",
      params: {
        index: currentHistory.currentIndex + 1,
        label: getHistoryEntryLabel(currentEntry),
      },
      tone: "success",
    });
  }

  function renderEmptyTestResults() {
    renderTestResults(null);
  }

  function runTests() {
    const result = testRunner.runAll();
    renderTestResults(result);

    setPatchLogModel({
      kind: "message",
      labelKey: "log.tests",
      summaryKey: "log.tests.summary",
      params: {
        total: result.summary.totalCases,
        passed: result.summary.passedCount,
        failed: result.summary.failedCount,
        skipped: result.summary.skippedCount,
      },
      tone: result.summary.failedCount > 0 ? "warn" : "success",
    });
    updateStatus("status.testsFinished", "status.testsFinished.detail", 4);
  }

  function populateScenarioSelect() {
    const selectedName = state.activeScenario?.name ?? controls.scenarioSelect.value;
    controls.scenarioSelect.textContent = "";

    scenarioRunner.list().forEach((scenario) => {
      const option = createElement("option", "", resolveScenarioLabel(scenario));
      option.value = scenario.name;
      controls.scenarioSelect.appendChild(option);
    });

    if (selectedName) {
      controls.scenarioSelect.value = selectedName;
    }
  }

  function rerenderLocalizedUi() {
    panels.applyTranslations(t);
    controls.applyTranslations(t);
    controls.setLanguageValue(i18n.getLanguage());
    populateScenarioSelect();
    syncLocalizedSurfaceLabels();
    renderHistory();
    renderInspect();
    renderDiffLog();
    renderPatchLog();
    renderTestResults(state.lastTestResult);
    updateModeBadge(state.engine?.getDiffMode() ?? DIFF_MODES.AUTO);

    if (state.activeScenario) {
      panels.introBody.textContent = resolveScenarioDescription(state.activeScenario);
    } else {
      panels.introBody.textContent = t("intro.body");
    }

    applyCurrentStatus();
  }

  function bindEvents() {
    controls.scenarioSelect.addEventListener("change", (event) => {
      loadScenario(event.target.value);
    });

    controls.languageSelect.addEventListener("change", (event) => {
      i18n.setLanguage(event.target.value);
      rerenderLocalizedUi();
    });

    panels.editorInput.addEventListener("input", () => {
      updateHtmlPreview();
    });

    Object.entries(controls.modeButtons).forEach(([mode, button]) => {
      button.addEventListener("click", () => {
        if (!state.engine) {
          return;
        }

        state.engine.setDiffMode(mode);
        updateModeBadge(mode);
        refreshDiffPreview();
        renderInspect();
        updateStatus("status.modeUpdated", "status.modeUpdated.detail", 2, {
          modeKey: mode,
        });
      });
    });

    controls.patchButton.addEventListener("click", () => {
      applyPatch();
    });

    controls.undoButton.addEventListener("click", () => {
      moveHistory("undo");
    });

    controls.redoButton.addEventListener("click", () => {
      moveHistory("redo");
    });

    panels.historyPanel.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-history-index]");

      if (!(chip instanceof HTMLElement)) {
        return;
      }

      const targetIndex = Number(chip.dataset.historyIndex);

      if (!Number.isInteger(targetIndex)) {
        return;
      }

      moveHistoryToIndex(targetIndex);
    });

    controls.resetButton.addEventListener("click", () => {
      if (state.activeScenario) {
        loadScenario(state.activeScenario.name);
        updateStatus("status.scenarioReset", "status.scenarioReset.detail", 0);
      }
    });

    controls.runTestsButton.addEventListener("click", () => {
      runTests();
    });
  }

  controls.setLanguageValue(i18n.getLanguage());
  populateScenarioSelect();
  bindEvents();
  renderEmptyTestResults();
  renderHistory();
  syncLocalizedSurfaceLabels();
  applyCurrentStatus();
  updateModeBadge(DIFF_MODES.AUTO);

  const defaultScenario = scenarioRunner.getDefault();

  if (defaultScenario) {
    controls.scenarioSelect.value = defaultScenario.name;
    loadScenario(defaultScenario.name);
  }

  return {
    panels,
    controls,
    loadScenario,
    runTests,
    setLanguage(language) {
      i18n.setLanguage(language);
      rerenderLocalizedUi();
    },
    getState() {
      return {
        activeScenario: state.activeScenario,
        previewVNode: state.previewVNode,
        diffMode: state.engine?.getDiffMode() ?? null,
        language: i18n.getLanguage(),
      };
    },
  };
}
