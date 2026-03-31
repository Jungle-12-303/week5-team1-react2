/*
 * Responsibility:
 * - 각 페이지 상단의 제목, 설명, 보조 액션을 공통 형식으로 렌더링한다.
 */

import { h } from "../../index.js";

function renderActions(actions = []) {
  return actions.map((action) =>
    h("button", {
      id: action.id,
      key: action.id,
      className: action.tone === "ghost" ? "ghost-button" : "secondary-button",
      onClick: action.onClick,
    }, action.label)
  );
}

export function PageHeader(props) {
  return h("section", { className: "page-header-card" },
    h("div", { className: "page-header-copy" },
      h("p", { className: "page-kicker" }, props.kicker),
      h("h1", { className: "page-title" }, props.title),
      h("p", { className: "page-description" }, props.description)
    ),
    props.actions && props.actions.length > 0
      ? h("div", { className: "page-header-actions" }, ...renderActions(props.actions))
      : h("div", { className: "page-header-actions page-header-actions-empty" })
  );
}
