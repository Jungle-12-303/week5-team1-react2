/*
 * Responsibility:
 * - 컬렉션 그리드와 대시보드에서 재사용할 카드 타일을 렌더링한다.
 */

import { h } from "../../index.js";

function renderTypeBadges(types) {
  return types.map((type) =>
    h("span", {
      key: type,
      className: `type-chip type-chip-${type}`,
    }, type)
  );
}

export function CardTile(props) {
  const card = props.card;
  const imageUrl = props.highResImage ? card.imageUrl : card.thumbUrl;
  const cardClassName = props.isSelected ? "card-tile is-selected" : "card-tile";

  return h("article", {
    id: props.tileId ?? `card-tile-${card.id}`,
    className: cardClassName,
    "data-card-id": card.id,
    "data-tilt-enabled": String(Boolean(props.tiltEnabled)),
    "data-glare-enabled": String(Boolean(props.glareEnabled)),
    onMousemove: props.onPointerMove ? (event) => props.onPointerMove(event, card.id) : undefined,
    onMouseleave: props.onPointerLeave ? (event) => props.onPointerLeave(event, card.id) : undefined,
  },
    h("button", {
      id: props.openId ?? `card-open-${card.id}`,
      className: "card-visual-button",
      onClick: () => props.onSelect(card.id),
    },
      h("div", { className: "card-light-frame" }),
      h("div", { className: "card-prism-layer" }),
      h("div", { className: "card-sparkle-layer" }),
      h("div", { className: "card-glare-layer" }),
      h("img", {
        className: "card-image",
        src: imageUrl,
        alt: `${card.name} artwork`,
      }),
      h("div", { className: "card-overlay" },
        h("span", { className: "card-number" }, `#${card.number}`),
        h("strong", { className: "card-name" }, card.name),
        h("div", { className: "card-type-row" }, ...renderTypeBadges(card.types))
      )
    ),
    h("div", { className: "card-meta-row" },
      h("span", { className: "card-rarity" }, card.rarity),
      h("button", {
        id: props.favoriteId ?? `card-favorite-${card.id}`,
        className: card.isFavorite ? "favorite-button is-active" : "favorite-button",
        onClick: () => props.onToggleFavorite(card.id),
      }, card.isFavorite ? "Saved" : "Save")
    )
  );
}
