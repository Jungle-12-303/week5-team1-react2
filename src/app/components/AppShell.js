/*
 * Responsibility:
 * - 카드 쇼케이스 서비스의 공통 앱 셸을 렌더링한다.
 */

import { h } from "../../index.js";
import { TopNavigation } from "./TopNavigation.js";
import { MobileTabBar } from "./MobileTabBar.js";

function renderPatchRows(runtimeSnapshot) {
  if (!runtimeSnapshot.patchLabels || runtimeSnapshot.patchLabels.length === 0) {
    return [
      h("li", { key: "empty", className: "inspector-patch-row is-empty" }, "No DOM patch was needed for the last render."),
    ];
  }

  return runtimeSnapshot.patchLabels.slice(0, 6).map((label, index) =>
    h("li", { key: `${label}-${index}`, className: "inspector-patch-row" }, label)
  );
}

export function AppShell(props) {
  // AppShell은 공통 크롬 역할만 담당한다.
  // 페이지마다 바뀌는 실제 내용은 props.children으로 받기 때문에
  // Dashboard, Collection, Detail, Settings 모두 같은 셸을 재사용할 수 있다.
  const inspectorCard = props.inspectorCard;
  const inspectorImageUrl = inspectorCard
    ? props.highResImage ? inspectorCard.imageUrl : inspectorCard.thumbUrl
    : null;

  const serviceBodyClassName = props.currentPage === "collection"
    ? "service-body is-collection-page"
    : "service-body";
  const inspectorClassName = props.currentPage === "collection"
    ? "runtime-inspector is-collection-inspector"
    : "runtime-inspector";

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
    props.catalogNotice
      // catalogNotice는 "원격 카탈로그를 못 불렀지만 앱은 동작한다"는 사실을
      // 사용자에게 알려주는 경고/안내 레이어다.
      ? h("section", { className: "runtime-notice-bar", id: "runtime-notice-bar" },
        h("span", { className: "runtime-notice-label" }, "Catalog Notice"),
        h("strong", { className: "runtime-notice-message", id: "runtime-notice-message" }, props.catalogNotice)
      )
      : null,
    h("section", { className: serviceBodyClassName },
      h("main", { className: "service-main" }, props.children),
      h("aside", { className: inspectorClassName, id: "runtime-inspector" },
        h("div", { className: "panel-heading" },
          h("h2", null, "Render / Patch Inspector"),
          h("p", null, "Use this panel as proof that the runtime updates only the affected DOM. Watch total renders, the patch count for the most recent render, and the cumulative patch total since mount.")
        ),
        h("div", { className: "inspector-stat-grid" },
          h("div", { className: "inspector-stat-card", id: "inspector-render-count" },
            h("span", { className: "inspector-stat-label" }, "Total Renders"),
            h("strong", { className: "inspector-stat-value" }, "0")
          ),
          h("div", { className: "inspector-stat-card", id: "inspector-last-patch-count" },
            h("span", { className: "inspector-stat-label" }, "Last Render Patch Count"),
            h("strong", { className: "inspector-stat-value" }, "0")
          ),
          h("div", { className: "inspector-stat-card", id: "inspector-total-patch-count" },
            h("span", { className: "inspector-stat-label" }, "Total Patches Since Mount"),
            h("strong", { className: "inspector-stat-value" }, "0")
          )
        ),
        h("article", { className: "inspector-note-card" },
          h("span", { className: "inspector-note-label" }, "Last Runtime Action"),
          h("strong", { className: "inspector-note-value", id: "inspector-last-action" }, props.lastAction),
          h("p", { className: "inspector-note-meta", id: "inspector-runtime-meta" }, "Reason: bootstrap · Diff: auto")
        ),
        h("article", { className: "inspector-patch-card" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Changed Patch Types"),
            h("p", null, "Watch for focused updates like SET_PROP: src when art mode changes, instead of a full page reload.")
          ),
          h("ul", { className: "inspector-patch-list", id: "runtime-inspector-patches" }, ...renderPatchRows({ patchLabels: [] }))
        ),
        inspectorCard
          ? h("article", {
            className: "inspector-probe-card",
            id: "runtime-inspector-probe",
            "data-patch-highlight-root": "true",
          },
            h("div", { className: "panel-heading" },
              h("h2", null, "Live Image Probe"),
              h("p", null, "Visible image source updates make img src patches easier to notice during the demo.")
            ),
            h("img", {
              id: "runtime-inspector-probe-image",
              className: "inspector-probe-image",
              src: inspectorImageUrl,
              alt: `${inspectorCard.name} runtime probe artwork`,
            }),
            h("div", { className: "inspector-probe-copy" },
              h("strong", { className: "inspector-probe-title" }, inspectorCard.name),
              h("span", { className: "inspector-probe-caption" }, props.highResImage ? "Official artwork source" : "Sprite thumbnail source")
            )
          )
          : null
      )
    ),
    h(MobileTabBar, {
      currentPage: props.currentPage,
      pages: props.pages,
      onNavigate: props.onNavigate,
    })
  );
}
