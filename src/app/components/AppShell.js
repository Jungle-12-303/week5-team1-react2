/*
 * Responsibility:
 * - 카드 쇼케이스 서비스의 공통 앱 셸을 렌더링한다.
 */

import { h } from "../../index.js";
import { TopNavigation } from "./TopNavigation.js";
import { MobileTabBar } from "./MobileTabBar.js";

export function AppShell(props) {
  return h("div", { className: "service-shell" },
    h(TopNavigation, {
      currentPage: props.currentPage,
      pages: props.pages,
      onNavigate: props.onNavigate,
    }),
    h("section", { className: "global-status-bar", id: "global-status-bar" },
      h("span", { className: "global-status-kicker" }, "Collection Runtime"),
      h("strong", { className: "global-status-message", id: "global-status-message" }, props.lastAction)
    ),
    h("main", { className: "service-body" }, props.children),
    h(MobileTabBar, {
      currentPage: props.currentPage,
      pages: props.pages,
      onNavigate: props.onNavigate,
    })
  );
}
