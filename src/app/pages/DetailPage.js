/*
 * Responsibility:
 * - 선택된 카드 한 장을 중심으로 렌더링하는 상세 페이지를 담당한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";
import { SummaryCard } from "../components/SummaryCard.js";
import { CardShowcase } from "../components/CardShowcase.js";

function getBaseStatTotal(card) {
  if (!card.baseStats) {
    return null;
  }

  return Object.values(card.baseStats).reduce((sum, value) => sum + Number(value || 0), 0);
}

function renderBaseStatRows(card) {
  if (!card.baseStats) {
    return [];
  }

  return [
    ["HP", card.baseStats.hp],
    ["Attack", card.baseStats.attack],
    ["Defense", card.baseStats.defense],
    ["Sp. Atk", card.baseStats.specialAttack],
    ["Sp. Def", card.baseStats.specialDefense],
    ["Speed", card.baseStats.speed],
  ].map(([label, value]) =>
    h("li", {
      key: label,
      className: "detail-stat-row",
    },
      h("span", { className: "detail-stat-name" }, label),
      h("strong", { className: "detail-stat-value" }, String(value))
    )
  );
}

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
  const baseStatTotal = props.card ? getBaseStatTotal(props.card) : null;

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
            id: "detail-card-bst",
            label: "Base Stat Total",
            value: baseStatTotal !== null ? String(baseStatTotal) : "N/A",
            help: "Species base stats are grouped together instead of showing HP alone.",
            tone: "warm",
          })
        ),
        h("article", { className: "panel-card detail-meta-card" },
          h("div", { className: "panel-heading" },
            h("h2", null, "Card Metadata"),
            h("p", null, "The detail panel reacts instantly when the selected card changes.")
          ),
          props.isDetailLoading
            ? h("p", { id: "detail-loading-state", className: "detail-flavor" }, "Loading full species stats from the remote catalog.")
            : null,
          props.detailError
            ? h("p", { id: "detail-error-state", className: "detail-flavor" }, props.detailError)
            : null,
          h("div", { id: "detail-card-types", className: "card-type-row detail-type-row" }, ...renderTypeBadges(props.card.types)),
          h("ul", { className: "insight-list detail-stat-list" },
            h("li", { id: "detail-stat-number" }, `Number · ${props.card.number}`),
            h("li", { id: "detail-stat-height" }, `Height · ${props.card.height}m`),
            h("li", { id: "detail-stat-weight" }, `Weight · ${props.card.weight}kg`)
          ),
          props.card.baseStats
            ? h("div", { className: "detail-base-stats-block" },
              h("h3", { className: "detail-subtitle" }, "Species Base Stats"),
              h("ul", { id: "detail-base-stats", className: "detail-base-stats-list" }, ...renderBaseStatRows(props.card))
            )
            : null,
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
