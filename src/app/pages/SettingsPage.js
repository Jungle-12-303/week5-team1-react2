/*
 * Responsibility:
 * - 카드 서비스 전역 설정과 데모 초기화 옵션을 렌더링한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";

function renderPageOptions(pages) {
  return Object.entries(pages)
    .filter(([page]) => page !== "detail")
    .map(([page, meta]) => h("option", { key: page, value: page }, meta.label));
}

function renderSortOptions() {
  return [
    h("option", { key: "number", value: "number" }, "Number"),
    h("option", { key: "name", value: "name" }, "Name"),
    h("option", { key: "favorites", value: "favorites" }, "Favorites First"),
  ];
}

export function SettingsPage(props) {
  return h("section", { id: "page-settings", className: "page-stack" },
    h(PageHeader, {
      kicker: "Settings",
      title: "Showcase Settings",
      description: "Tune the demo behavior and runtime presentation without leaving the single root app.",
      actions: [
        {
          id: "settings-reset-demo",
          label: "Reset Showcase",
          onClick: props.onResetDemo,
        },
      ],
    }),
    h("section", { className: "settings-grid" },
      h("article", { className: "panel-card" },
        h("div", { className: "panel-heading" },
          h("h2", null, "Default View"),
          h("p", null, "Choose the first page shown when the app starts.")
        ),
        h("label", { className: "field" },
          h("span", { className: "field-label" }, "Default Page"),
          h("select", {
            id: "settings-default-page",
            value: props.settings.defaultPage,
            onChange: props.onDefaultPageChange,
          }, ...renderPageOptions(props.pages))
        )
      ),
      h("article", { className: "panel-card" },
        h("div", { className: "panel-heading" },
          h("h2", null, "Collection Sorting"),
          h("p", null, "Apply a default sorting strategy for the gallery page.")
        ),
        h("label", { className: "field" },
          h("span", { className: "field-label" }, "Default Sort"),
          h("select", {
            id: "settings-default-sort",
            value: props.settings.defaultSortMode,
            onChange: props.onDefaultSortChange,
          }, ...renderSortOptions())
        )
      ),
      h("article", { className: "panel-card" },
        h("div", { className: "panel-heading" },
          h("h2", null, "Card Motion"),
          h("p", null, "Toggle the card-local 3D tilt and glare effects without changing the global app state model.")
        ),
        h("label", { className: "checkbox-field" },
          h("input", {
            id: "settings-tilt-toggle",
            type: "checkbox",
            checked: props.settings.tiltEnabled,
            onChange: props.onTiltToggle,
          }),
          h("span", null, props.settings.tiltEnabled ? "Tilt enabled" : "Tilt disabled")
        ),
        h("label", { className: "checkbox-field" },
          h("input", {
            id: "settings-glare-toggle",
            type: "checkbox",
            checked: props.settings.glareEnabled,
            onChange: props.onGlareToggle,
          }),
          h("span", null, props.settings.glareEnabled ? "Glare enabled" : "Glare disabled")
        ),
        h("label", { className: "checkbox-field" },
          h("input", {
            id: "settings-highres-toggle",
            type: "checkbox",
            checked: props.settings.highResImage,
            onChange: props.onHighResToggle,
          }),
          h("span", null, props.settings.highResImage ? "High-res art enabled" : "Thumbnail mode enabled")
        )
      )
    ),
    h("article", { className: "panel-card runtime-info-card" },
      h("div", { className: "panel-heading" },
        h("h2", null, "Runtime Notes"),
        h("p", null, "The app still uses one root component. Only card-local motion effects escape the normal state/render loop.")
      ),
      h("ul", { className: "insight-list" },
        h("li", null, "Single mount on #app"),
        h("li", null, "State-based multi-page navigation"),
        h("li", null, "Tilt and glare handled as local DOM presentation effects"),
        h("li", null, "Favorites and settings persisted through localStorage")
      )
    )
  );
}
