/*
 * Responsibility:
 * - 선택된 카드 한 장을 중심으로 렌더링하는 상세 페이지를 담당한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";
import { SummaryCard } from "../components/SummaryCard.js";
import { CardShowcase } from "../components/CardShowcase.js";

function renderTypeBadges(types) {
  return types.map((type) =>
    h("span", { key: type, className: `type-chip type-chip-${type}` }, type)
  );
}

function renderRelatedCards(cards, onSelect) {
  return cards.map((card) =>
    h("button", {
      key: card.id,
      id: `detail-related-${card.id}`,
      className: "related-card-button",
      onClick: () => onSelect(card.id),
    }, card.name)
  );
}

export function DetailPage(props) {
  if (!props.card) {
    return h("section", { id: "page-detail", className: "page-stack" },
      h(PageHeader, {
        kicker: "Detail",
        title: "No Card Selected",
        description: "Pick a card from the collection to open the immersive showcase view.",
        actions: [
          {
            id: "detail-go-collection",
            label: "Open Collection",
            onClick: () => props.onNavigate("collection"),
          },
        ],
      }),
      h("article", { className: "panel-card empty-detail-card" },
        h("p", { id: "detail-empty-state", className: "empty-state" }, "Select a card to activate the detailed showcase view.")
      )
    );
  }

  return h("section", { id: "page-detail", className: "page-stack" },
    h(PageHeader, {
      kicker: "Detail",
      title: props.card.name,
      description: "This page combines runtime-driven data with a card-local 3D tilt and glare interaction.",
      actions: [
        {
          id: "detail-back-to-collection",
          label: "Back to Collection",
          onClick: () => props.onNavigate("collection"),
          tone: "ghost",
        },
      ],
    }),
    h("section", { className: "detail-layout" },
      h(CardShowcase, {
        card: props.card,
        tiltEnabled: props.settings.tiltEnabled,
        glareEnabled: props.settings.glareEnabled,
        highResImage: props.settings.highResImage,
        onPointerMove: props.onPointerMove,
        onPointerLeave: props.onPointerLeave,
      }),
      h("div", { className: "detail-side-panel" },
        h("section", { className: "dashboard-grid detail-kpis" },
          h(SummaryCard, {
            id: "detail-card-rarity",
            label: "Rarity",
            value: props.card.rarity,
            help: "A quick summary value derived from the selected card record.",
          }),
          h(SummaryCard, {
            id: "detail-card-hp",
            label: "HP",
            value: String(props.card.hp),
            help: "The selected card stats update as soon as the selected card changes.",
            tone: "warm",
          })
        ),
        h("article", { className: "panel-card detail-meta-card" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Card Metadata"),
            h("p", null, "The detail panel reacts instantly when the selected card changes.")
          ),
          h("div", { id: "detail-card-types", className: "card-type-row detail-type-row" }, ...renderTypeBadges(props.card.types)),
          h("ul", { className: "insight-list detail-stat-list" },
            h("li", { id: "detail-stat-number" }, `Number · ${props.card.number}`),
            h("li", { id: "detail-stat-height" }, `Height · ${props.card.height}m`),
            h("li", { id: "detail-stat-weight" }, `Weight · ${props.card.weight}kg`)
          ),
          h("p", { id: "detail-card-flavor", className: "detail-flavor" }, props.card.flavor),
          h("div", { className: "detail-button-row" },
            h("button", {
              id: `detail-favorite-${props.card.id}`,
              className: props.card.isFavorite ? "primary-button" : "secondary-button",
              onClick: () => props.onToggleFavorite(props.card.id),
            }, props.card.isFavorite ? "Remove from Saved" : "Save to Favorites"),
            h("button", {
              id: "detail-next-card",
              className: "ghost-button",
              onClick: props.onSelectNext,
            }, "Next Card")
          )
        ),
        h("article", { className: "panel-card" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Related Cards"),
            h("p", null, "Quick links let the runtime swap the selected card without remounting the app.")
          ),
          h("div", { id: "detail-related-list", className: "related-card-row" }, ...renderRelatedCards(props.relatedCards, props.onSelectCard))
        )
      )
    )
  );
}
