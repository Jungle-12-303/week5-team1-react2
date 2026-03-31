/*
 * Responsibility:
 * - 모바일용 하단 탭 내비게이션을 렌더링한다.
 */

import { h } from "../../index.js";

export function MobileTabBar(props) {
  return h("nav", { className: "mobile-tabbar" },
    ...Object.entries(props.pages).map(([page, meta]) =>
      h("button", {
        id: `mobile-nav-${page}`,
        key: page,
        className: props.currentPage === page ? "mobile-tab is-active" : "mobile-tab",
        onClick: () => props.onNavigate(page),
      }, h("span", { className: "mobile-tab-label" }, meta.label))
    )
  );
}
