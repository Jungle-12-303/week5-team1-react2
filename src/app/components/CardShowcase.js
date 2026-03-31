/*
 * Responsibility:
 * - 상세 페이지에서 사용할 큰 카드 프리뷰를 렌더링한다.
 */

import { h } from "../../index.js";

export function CardShowcase(props) {
  const card = props.card;
  const imageUrl = props.highResImage ? card.imageUrl : card.thumbUrl;

  return h("article", {
    id: "detail-showcase",
    className: "detail-showcase",
    "data-card-id": card.id,
    "data-tilt-enabled": String(Boolean(props.tiltEnabled)),
    "data-glare-enabled": String(Boolean(props.glareEnabled)),
    onMousemove: props.onPointerMove ? (event) => props.onPointerMove(event, card.id) : undefined,
    onMouseleave: props.onPointerLeave ? (event) => props.onPointerLeave(event, card.id) : undefined,
  },
    h("div", { className: "card-light-frame is-detail" }),
    h("div", { className: "card-prism-layer is-detail" }),
    h("div", { className: "card-glare-layer is-detail" }),
    h("img", {
      id: "detail-card-image",
      className: "detail-card-image",
      src: imageUrl,
      alt: `${card.name} full artwork`,
    }),
    h("div", { className: "detail-card-caption" },
      h("span", { id: "detail-card-number", className: "detail-card-number" }, `#${card.number}`),
      h("strong", { id: "detail-card-name", className: "detail-card-name" }, card.name)
    )
  );
}
