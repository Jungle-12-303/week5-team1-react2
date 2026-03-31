/*
 * Responsibility:
 * - 카드 검색, 필터, 정렬, 선택, 즐겨찾기 토글을 담당하는 페이지를 렌더링한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";
import { CollectionToolbar } from "../components/CollectionToolbar.js";
import { CardTile } from "../components/CardTile.js";

function renderCards(props) {
  if (props.cards.length === 0) {
    return [h("p", { id: "collection-empty-state", className: "empty-state" }, props.emptyMessage)];
  }

  return props.cards.map((card) =>
    h(CardTile, {
      key: card.id,
      card,
      isSelected: props.selectedCardId === card.id,
      tiltEnabled: props.settings.tiltEnabled,
      glareEnabled: props.settings.glareEnabled,
      highResImage: props.settings.highResImage,
      onSelect: props.onSelectCard,
      onToggleFavorite: props.onToggleFavorite,
      onPointerMove: props.onPointerMove,
      onPointerLeave: props.onPointerLeave,
    })
  );
}

export function CollectionPage(props) {
  return h("section", { id: "page-collection", className: "page-stack" },
    h(PageHeader, {
      kicker: "Collection",
      title: "Interactive Card Gallery",
      description: "Search, filter, sort, and select cards while the runtime updates the grid and detail state in real time.",
      actions: [
        {
          id: "collection-go-detail",
          label: "View Detail",
          onClick: () => props.onNavigate("detail"),
          tone: "ghost",
        },
      ],
    }),
    h(CollectionToolbar, {
      visibleCount: props.cards.length,
      totalCount: props.totalCount,
      searchKeyword: props.searchKeyword,
      typeFilter: props.typeFilter,
      favoritesOnly: props.favoritesOnly,
      sortMode: props.sortMode,
      typeLabels: props.typeLabels,
      onSearchInput: props.onSearchInput,
      onTypeFilterChange: props.onTypeFilterChange,
      onFavoritesToggle: props.onFavoritesToggle,
      onSortChange: props.onSortChange,
    }),
    h("section", { id: "collection-card-grid", className: "card-grid" }, ...renderCards(props))
  );
}
