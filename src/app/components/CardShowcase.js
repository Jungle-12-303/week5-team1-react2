/*
 * Responsibility:
 * - 상세 페이지에서 사용할 큰 카드 프리뷰를 렌더링한다.
 */

import { h } from "../../index.js";

export function CardShowcase(props) {
  const card = props.card;
  const displayName = card.displayName ?? card.name;
  // 설정 페이지에서 고해상도 이미지를 끄면 네트워크 부담을 줄이기 위해
  // 더 작은 썸네일을 쓰도록 분기한다.
  const imageUrl = props.highResImage ? card.imageUrl : card.thumbUrl;

  return h("article", {
    id: "detail-showcase",
    className: "detail-showcase",
    "data-card-id": card.id,
    "data-patch-highlight-root": "true",
    "data-tilt-enabled": String(Boolean(props.tiltEnabled)),
    "data-glare-enabled": String(Boolean(props.glareEnabled)),
    onMousemove: props.onPointerMove ? (event) => props.onPointerMove(event, card.id) : undefined,
    onMouseleave: props.onPointerLeave ? (event) => props.onPointerLeave(event, card.id) : undefined,
  },
    // 아래 레이어들은 "카드 표면 재질"을 만들기 위한 시각 효과다.
    // 실제 카드 데이터 변경과는 무관하며, DOM 스타일만 움직인다.
    h("div", { className: "card-light-frame is-detail" }),
    h("div", { className: "card-prism-layer is-detail" }),
    h("div", { className: "card-sparkle-layer is-detail" }),
    h("div", { className: "card-glare-layer is-detail" }),
    h("img", {
      id: "detail-card-image",
      className: "detail-card-image",
      src: imageUrl,
      alt: `${displayName} full artwork`,
    }),
    h("div", { className: "detail-card-caption" },
      h("span", { id: "detail-card-number", className: "detail-card-number" }, `#${card.number}`),
      h("strong", { id: "detail-card-name", className: "detail-card-name" }, displayName)
    )
  );
}
