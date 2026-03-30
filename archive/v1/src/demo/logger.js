/*
 * Responsibility:
 * - diff/patch/test 결과를 사용자 친화적인 카드형 로그 목록으로 렌더링한다.
 * - demo UI가 단순 문자열 누적이 아니라 구조화된 요약 정보를 보여줄 수 있게 한다.
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

function normalizeEntry(entry) {
  if (typeof entry === "string") {
    return {
      label: "INFO",
      detail: "",
      summary: entry,
      tone: "neutral",
    };
  }

  return {
    label: entry.label ?? "INFO",
    detail: entry.detail ?? "",
    summary: entry.summary ?? "",
    tone: entry.tone ?? "neutral",
  };
}

function renderEmptyState(container, emptyMessage) {
  container.textContent = "";
  const empty = createElement("p", "demo-log-empty", emptyMessage);
  container.appendChild(empty);
}

function defaultTranslator(key) {
  return key;
}

export function formatPatchEntry(patch, t = defaultTranslator) {
  const detailParts = [`type:${patch.type}`];

  if (Array.isArray(patch.path)) {
    detailParts.push(`path:[${patch.path.join(",")}]`);
  }

  if (patch.key !== undefined) {
    detailParts.push(`key:${patch.key}`);
  }

  if (patch.index !== undefined) {
    detailParts.push(`index:${patch.index}`);
  }

  if (patch.fromIndex !== undefined && patch.toIndex !== undefined) {
    detailParts.push(`from:${patch.fromIndex}`);
    detailParts.push(`to:${patch.toIndex}`);
  }

  if (patch.name) {
    detailParts.push(`name:${patch.name}`);
  }

  return {
    label: patch.type,
    detail: detailParts.join(" "),
    summary: describePatch(patch, t),
    tone: patch.type.includes("REMOVE") ? "warn" : "neutral",
  };
}

export function describePatch(patch, t = defaultTranslator) {
  switch (patch.type) {
    case "SET_PROP":
      return t("patch.SET_PROP", { name: patch.name });
    case "REMOVE_PROP":
      return t("patch.REMOVE_PROP", { name: patch.name });
    case "SET_TEXT":
      return t("patch.SET_TEXT");
    case "INSERT_CHILD":
      return t("patch.INSERT_CHILD");
    case "REMOVE_CHILD":
      return t("patch.REMOVE_CHILD");
    case "MOVE_CHILD":
      return t("patch.MOVE_CHILD");
    case "REPLACE_NODE":
      return t("patch.REPLACE_NODE");
    case "SET_EVENT":
      return t("patch.SET_EVENT", { name: patch.name });
    case "REMOVE_EVENT":
      return t("patch.REMOVE_EVENT", { name: patch.name });
    default:
      return "Apply a patch step.";
  }
}

export function createLogger(container, options = {}) {
  const state = {
    entries: [],
    emptyMessage: options.emptyMessage ?? "No entries yet.",
  };

  function render() {
    if (!container) {
      return;
    }

    container.textContent = "";

    if (state.entries.length === 0) {
      renderEmptyState(container, state.emptyMessage);
      return;
    }

    const list = createElement("ul", "demo-log-items");

    state.entries.forEach((rawEntry) => {
      const entry = normalizeEntry(rawEntry);
      const item = createElement("li", `demo-log-item tone-${entry.tone}`);
      const label = createElement("span", "demo-log-label", entry.label);
      const detail = createElement("code", "demo-log-detail", entry.detail);
      const summary = createElement("p", "demo-log-summary", entry.summary);

      item.appendChild(label);

      if (entry.detail) {
        item.appendChild(detail);
      }

      if (entry.summary) {
        item.appendChild(summary);
      }

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  return {
    setEntries(entries) {
      state.entries = entries.slice();
      render();
    },
    append(entry) {
      state.entries = [normalizeEntry(entry), ...state.entries];
      render();
    },
    clear() {
      state.entries = [];
      render();
    },
    getEntries() {
      return state.entries.slice();
    },
    setEmptyMessage(message) {
      state.emptyMessage = message;
      render();
    },
  };
}
