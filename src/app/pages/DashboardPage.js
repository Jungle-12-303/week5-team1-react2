/*
 * Responsibility:
 * - 카드 쇼케이스 서비스의 요약 대시보드를 렌더링한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";
import { SummaryCard } from "../components/SummaryCard.js";
import { CardTile } from "../components/CardTile.js";

function renderTypeSummary(items) {
  if (items.length === 0) {
    return [h("li", { key: "empty" }, "No type data yet.")];
  }

  return items.map((item) =>
    h("li", { key: item.type }, `${item.label} · ${item.count}`)
  );
}

export function DashboardPage(props) {
  return h("section", { id: "page-dashboard", className: "page-stack" },
    h(PageHeader, {
      kicker: "Dashboard",
      title: "Card Collection Showcase",
      description: "Track the current collection, spotlight a premium card, and jump into the interactive gallery.",
      actions: [
        {
          id: "dashboard-go-collection",
          label: "Open Collection",
          onClick: () => props.onNavigate("collection"),
        },
      ],
    }),
    h("section", { className: "dashboard-grid" },
      h(SummaryCard, {
        id: "summary-total-cards",
        label: "Total Cards",
        value: String(props.totalCount),
        help: "Cards currently loaded into the showcase runtime.",
        tone: "warm",
      }),
      h(SummaryCard, {
        id: "summary-favorite-cards",
        label: "Saved Cards",
        value: String(props.favoriteCount),
        help: "Favorites are shared across dashboard, collection, and detail pages.",
        tone: "success",
      }),
      h(SummaryCard, {
        id: "summary-visible-cards",
        label: "Visible Cards",
        value: String(props.visibleCount),
        help: "Count after the current filter and sort settings are applied.",
      }),
      h(SummaryCard, {
        id: "summary-selected-card",
        label: "Selected Card",
        value: props.selectedCard ? props.selectedCard.name : "None",
        help: "The active card powers the detail page and spotlight area.",
      })
    ),
    h("section", { className: "dashboard-two-column" },
      h("article", { className: "panel-card spotlight-panel" },
        h("div", { className: "panel-heading" },
          h("h2", null, "Spotlight Card"),
          h("p", null, "This featured card responds to the same runtime state used by the rest of the app.")
        ),
        props.spotlightCard
          ? h(CardTile, {
            card: props.spotlightCard,
            isSelected: props.selectedCard?.id === props.spotlightCard.id,
            tiltEnabled: props.settings.tiltEnabled,
            glareEnabled: props.settings.glareEnabled,
            highResImage: props.settings.highResImage,
            onSelect: props.onSelectCard,
            onToggleFavorite: props.onToggleFavorite,
            onPointerMove: props.onPointerMove,
            onPointerLeave: props.onPointerLeave,
            tileId: "dashboard-spotlight-card",
            openId: "dashboard-spotlight-open",
            favoriteId: "dashboard-spotlight-favorite",
          })
          : h("p", { className: "empty-state" }, "No spotlight card is available right now.")
      ),
      h("div", { className: "dashboard-stack" },
        h("article", { className: "panel-card activity-panel" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Latest Runtime Action"),
            h("p", null, "This shared message helps demonstrate how root state affects multiple pages at once.")
          ),
          h("div", { className: "activity-callout" },
            h("strong", { id: "dashboard-last-action", className: "activity-title" }, props.lastAction),
            h("p", { className: "activity-description", id: "dashboard-top-type" }, props.topTypeMessage)
          )
        ),
        h("article", { className: "panel-card" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Type Breakdown"),
            h("p", null, "A derived summary that changes whenever collection state changes.")
          ),
          h("ul", { id: "dashboard-type-summary", className: "insight-list" }, ...renderTypeSummary(props.typeSummary))
        )
      )
    )
  );
}
