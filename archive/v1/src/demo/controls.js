/*
 * Responsibility:
 * - 시연 페이지의 scenario 선택, 언어 전환, diff mode 전환, action 버튼 UI를 생성한다.
 * - demo app의 상태에 맞춰 버튼 활성/비활성, active mode, active language를 갱신한다.
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

function createActionButton(label, className = "") {
  return createElement("button", `demo-action-button ${className}`.trim(), label);
}

function createField(labelText, inputElement) {
  const field = createElement("div", "demo-control-field");
  const label = createElement("label", "demo-control-label", labelText);

  field.appendChild(label);
  field.appendChild(inputElement);

  return {
    field,
    label,
    inputElement,
  };
}

export function createControls(root, options = {}) {
  const t = options.t ?? ((key) => key);
  const languages = options.languages ?? [];

  const wrapper = createElement("div", "demo-controls");
  const scenarioGroup = createElement("div", "demo-control-group");
  const languageGroup = createElement("div", "demo-control-group");
  const modeGroup = createElement("div", "demo-control-group");
  const actionGroup = createElement("div", "demo-control-group demo-control-group-actions");

  const scenarioSelect = createElement("select", "demo-scenario-select");
  scenarioSelect.setAttribute("aria-label", t("controls.scenario"));
  const scenarioField = createField(t("controls.scenario"), scenarioSelect);
  scenarioGroup.appendChild(scenarioField.field);

  const languageSelect = createElement("select", "demo-scenario-select");
  languageSelect.setAttribute("aria-label", t("controls.language"));
  const languageField = createField(t("controls.language"), languageSelect);
  languageGroup.appendChild(languageField.field);

  const modeLabel = createElement("span", "demo-control-label", t("controls.diffMode"));
  const modeButtons = {
    auto: createActionButton(t("controls.mode.auto"), "is-mode"),
    index: createActionButton(t("controls.mode.index"), "is-mode"),
    keyed: createActionButton(t("controls.mode.keyed"), "is-mode"),
  };

  modeGroup.appendChild(modeLabel);
  Object.values(modeButtons).forEach((button) => modeGroup.appendChild(button));

  const patchButton = createActionButton(t("controls.patch"), "is-primary");
  const undoButton = createActionButton(t("controls.undo"));
  const redoButton = createActionButton(t("controls.redo"));
  const resetButton = createActionButton(t("controls.reset"), "is-danger");
  const runTestsButton = createActionButton(t("controls.runTests"), "is-success");

  actionGroup.appendChild(patchButton);
  actionGroup.appendChild(undoButton);
  actionGroup.appendChild(redoButton);
  actionGroup.appendChild(resetButton);
  actionGroup.appendChild(runTestsButton);

  wrapper.appendChild(scenarioGroup);
  wrapper.appendChild(languageGroup);
  wrapper.appendChild(modeGroup);
  wrapper.appendChild(actionGroup);
  root.appendChild(wrapper);

  function renderLanguageOptions(nextT) {
    const previousValue = languageSelect.value;

    languageSelect.textContent = "";

    languages.forEach((languageCode) => {
      const option = createElement("option", "", nextT(`language.${languageCode}`));
      option.value = languageCode;
      languageSelect.appendChild(option);
    });

    if (previousValue) {
      languageSelect.value = previousValue;
    }
  }

  function applyTranslations(nextT) {
    scenarioField.label.textContent = nextT("controls.scenario");
    scenarioSelect.setAttribute("aria-label", nextT("controls.scenario"));
    languageField.label.textContent = nextT("controls.language");
    languageSelect.setAttribute("aria-label", nextT("controls.language"));
    renderLanguageOptions(nextT);

    modeLabel.textContent = nextT("controls.diffMode");
    modeButtons.auto.textContent = nextT("controls.mode.auto");
    modeButtons.index.textContent = nextT("controls.mode.index");
    modeButtons.keyed.textContent = nextT("controls.mode.keyed");

    patchButton.textContent = nextT("controls.patch");
    undoButton.textContent = nextT("controls.undo");
    redoButton.textContent = nextT("controls.redo");
    resetButton.textContent = nextT("controls.reset");
    runTestsButton.textContent = nextT("controls.runTests");

    patchButton.title = nextT("controls.patchTitle");
    undoButton.title = nextT("controls.undoTitle");
    redoButton.title = nextT("controls.redoTitle");
    resetButton.title = nextT("controls.resetTitle");
    runTestsButton.title = nextT("controls.runTestsTitle");
  }

  applyTranslations(t);

  return {
    wrapper,
    scenarioSelect,
    languageSelect,
    modeButtons,
    patchButton,
    undoButton,
    redoButton,
    resetButton,
    runTestsButton,
    applyTranslations,
    setLanguageValue(language) {
      languageSelect.value = language;
    },
    setActiveMode(mode) {
      Object.entries(modeButtons).forEach(([key, button]) => {
        button.classList.toggle("is-active", key === mode);
        button.setAttribute("aria-pressed", key === mode ? "true" : "false");
      });
    },
    setHistoryButtonState({ canUndo, canRedo }) {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
    },
    setEditorDependentActions(disabled) {
      patchButton.disabled = disabled;
    },
  };
}
