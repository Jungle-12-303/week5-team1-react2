/*
 * Responsibility:
 * - 시연 페이지의 전체 DOM 뼈대를 생성한다.
 * - header, onboarding, stepper, main panels, logs, history, inspect 영역을 구분해 제공한다.
 *
 * Detailed logic:
 * - panel 생성 책임만 담당하고, 실제 상태 변경과 데이터 렌더링은 app.js가 맡는다.
 * - 언어 전환 시 전체 패널 라벨을 다시 칠할 수 있도록 번역 대상 element refs를 함께 반환한다.
 */

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

function createBadge(className, textContent = "") {
  return createElement("span", `demo-badge ${className}`.trim(), textContent);
}

function createPanel(panelKey, toneClass, t) {
  const section = createElement("section", `demo-panel ${toneClass}`.trim());
  const header = createElement("div", "demo-panel-header");
  const titleElement = createElement("h2", "demo-panel-title", t(`${panelKey}.title`));
  const descriptionElement = createElement(
    "p",
    "demo-panel-description",
    t(`${panelKey}.description`)
  );
  const body = createElement("div", "demo-panel-body");

  header.appendChild(titleElement);
  header.appendChild(descriptionElement);
  section.appendChild(header);
  section.appendChild(body);

  return {
    section,
    header,
    titleElement,
    descriptionElement,
    body,
    panelKey,
  };
}

function createStepperItem(label) {
  const item = createElement("li", "demo-stepper-item");
  const dot = createElement("span", "demo-stepper-dot");
  const text = createElement("span", "demo-stepper-label", label);

  item.appendChild(dot);
  item.appendChild(text);

  return {
    item,
    dot,
    text,
  };
}

export function createPanels(root, t) {
  root.textContent = "";

  const shell = createElement("div", "demo-shell");

  const header = createElement("header", "demo-header");
  const headerText = createElement("div", "demo-header-text");
  const title = createElement("h1", "demo-title", t("header.title"));
  const subtitle = createElement("p", "demo-subtitle", t("header.subtitle"));
  const headerMeta = createElement("div", "demo-header-meta");
  const modeBadge = createBadge("demo-badge-mode", "");
  const historyBadge = createBadge("demo-badge-history", "");
  const statusBadge = createBadge("demo-badge-status", "");

  headerText.appendChild(title);
  headerText.appendChild(subtitle);
  headerMeta.appendChild(modeBadge);
  headerMeta.appendChild(historyBadge);
  headerMeta.appendChild(statusBadge);
  header.appendChild(headerText);
  header.appendChild(headerMeta);

  const intro = createElement("section", "demo-intro");
  const introTitle = createElement("h2", "demo-intro-title", t("intro.title"));
  const introBody = createElement("p", "demo-intro-body", t("intro.body"));
  const introHint = createElement("p", "demo-intro-hint", t("intro.hint"));
  intro.appendChild(introTitle);
  intro.appendChild(introBody);
  intro.appendChild(introHint);

  const stepper = createElement("section", "demo-stepper");
  const stepperList = createElement("ol", "demo-stepper-list");
  const stepItems = [
    { key: "step.editTarget", ...createStepperItem(t("step.editTarget")) },
    { key: "step.buildVDOM", ...createStepperItem(t("step.buildVDOM")) },
    { key: "step.findDiff", ...createStepperItem(t("step.findDiff")) },
    { key: "step.applyPatch", ...createStepperItem(t("step.applyPatch")) },
    { key: "step.moveHistory", ...createStepperItem(t("step.moveHistory")) },
  ];

  for (const stepItem of stepItems) {
    stepperList.appendChild(stepItem.item);
  }

  stepper.appendChild(stepperList);

  const controlsHost = createElement("section", "demo-controls-host");

  const mainGrid = createElement("section", "demo-main-grid");
  const editorPanel = createPanel("panels.editor", "demo-panel-editor", t);
  const testPanel = createPanel("panels.test", "demo-panel-test", t);
  const actualPanel = createPanel("panels.actual", "demo-panel-actual", t);

  const editorMeta = createElement("div", "demo-editor-meta");
  const editorHint = createElement("p", "demo-editor-hint", t("panels.editor.hint"));
  const editorStateBadge = createBadge("demo-badge-subtle", "");
  const editorInput = createElement("textarea", "demo-editor-input");
  editorInput.setAttribute("spellcheck", "false");
  editorInput.setAttribute("aria-label", t("panels.editor.title"));

  editorMeta.appendChild(editorHint);
  editorMeta.appendChild(editorStateBadge);
  editorPanel.body.appendChild(editorMeta);
  editorPanel.body.appendChild(editorInput);

  const testStateBadge = createBadge("demo-badge-subtle", "");
  const testBody = createElement("div", "demo-preview-surface");
  testPanel.body.appendChild(testStateBadge);
  testPanel.body.appendChild(testBody);

  const actualStateBadge = createBadge("demo-badge-subtle", "");
  const actualBody = createElement("div", "demo-preview-surface");
  actualPanel.body.appendChild(actualStateBadge);
  actualPanel.body.appendChild(actualBody);

  mainGrid.appendChild(editorPanel.section);
  mainGrid.appendChild(testPanel.section);
  mainGrid.appendChild(actualPanel.section);

  const logsGrid = createElement("section", "demo-logs-grid");
  const diffPanel = createPanel("panels.diff", "demo-panel-diff", t);
  const patchPanel = createPanel("panels.patch", "demo-panel-patch", t);

  const diffLog = createElement("div", "demo-log-list");
  const patchLog = createElement("div", "demo-log-list");
  diffPanel.body.appendChild(diffLog);
  patchPanel.body.appendChild(patchLog);
  logsGrid.appendChild(diffPanel.section);
  logsGrid.appendChild(patchPanel.section);

  const footerGrid = createElement("section", "demo-footer-grid");
  const historyPanel = createPanel("panels.history", "demo-panel-history", t);
  const inspectPanel = createPanel("panels.inspect", "demo-panel-inspect", t);

  const historyBody = createElement("div", "demo-history-list");
  const inspectBody = createElement("pre", "demo-inspect-view");
  const testResultsTitle = createElement("h3", "demo-test-results-title", t("panels.tests.title"));
  const testResultsBody = createElement("div", "demo-test-results");

  historyPanel.body.appendChild(historyBody);
  inspectPanel.body.appendChild(inspectBody);
  inspectPanel.body.appendChild(testResultsTitle);
  inspectPanel.body.appendChild(testResultsBody);

  footerGrid.appendChild(historyPanel.section);
  footerGrid.appendChild(inspectPanel.section);

  shell.appendChild(header);
  shell.appendChild(intro);
  shell.appendChild(stepper);
  shell.appendChild(controlsHost);
  shell.appendChild(mainGrid);
  shell.appendChild(logsGrid);
  shell.appendChild(footerGrid);
  root.appendChild(shell);

  function applyTranslations(nextT) {
    title.textContent = nextT("header.title");
    subtitle.textContent = nextT("header.subtitle");
    introTitle.textContent = nextT("intro.title");

    for (const stepItem of stepItems) {
      stepItem.text.textContent = nextT(stepItem.key);
    }

    editorPanel.titleElement.textContent = nextT("panels.editor.title");
    editorPanel.descriptionElement.textContent = nextT("panels.editor.description");
    testPanel.titleElement.textContent = nextT("panels.test.title");
    testPanel.descriptionElement.textContent = nextT("panels.test.description");
    actualPanel.titleElement.textContent = nextT("panels.actual.title");
    actualPanel.descriptionElement.textContent = nextT("panels.actual.description");
    diffPanel.titleElement.textContent = nextT("panels.diff.title");
    diffPanel.descriptionElement.textContent = nextT("panels.diff.description");
    patchPanel.titleElement.textContent = nextT("panels.patch.title");
    patchPanel.descriptionElement.textContent = nextT("panels.patch.description");
    historyPanel.titleElement.textContent = nextT("panels.history.title");
    historyPanel.descriptionElement.textContent = nextT("panels.history.description");
    inspectPanel.titleElement.textContent = nextT("panels.inspect.title");
    inspectPanel.descriptionElement.textContent = nextT("panels.inspect.description");
    testResultsTitle.textContent = nextT("panels.tests.title");
    editorInput.setAttribute("aria-label", nextT("panels.editor.title"));
  }

  return {
    shell,
    title,
    subtitle,
    introTitle,
    introBody,
    introHint,
    modeBadge,
    historyBadge,
    statusBadge,
    stepItems,
    controlsHost,
    editorInput,
    editorHint,
    editorStateBadge,
    testStateBadge,
    actualStateBadge,
    actualPanel: actualBody,
    testPanel: testBody,
    diffLog,
    patchLog,
    historyPanel: historyBody,
    inspectPanel: inspectBody,
    testResultsPanel: testResultsBody,
    applyTranslations,
  };
}
