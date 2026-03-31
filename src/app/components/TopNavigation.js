/*
 * Responsibility:
 * - 데스크톱용 상단 내비게이션을 렌더링한다.
 */

import { h } from "../../index.js";

function renderButtons(currentPage, pages, onNavigate) {
  return Object.entries(pages).map(([page, meta]) =>
    h("button", {
      id: `nav-${page}`,
      key: page,
      className: currentPage === page ? "nav-button is-active" : "nav-button",
      onClick: () => onNavigate(page),
    }, meta.label)
  );
}

export function TopNavigation(props) {
  const currentMeta = props.pages[props.currentPage];

  return h("header", { className: "top-nav" },
    h("div", { className: "brand-block" },
      h("p", { className: "brand-eyebrow" }, "Prism Dex"),
      h("strong", { className: "brand-title" }, "Card Collection Showcase"),
      h("span", { className: "brand-page", id: "brand-page-label" }, currentMeta.label)
    ),
    h("nav", { className: "nav-row" }, ...renderButtons(props.currentPage, props.pages, props.onNavigate))
  );
}
