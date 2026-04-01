/*
 * Responsibility:
 * - 카드 검색, 필터, 정렬, 선택, 즐겨찾기 토글을 담당하는 페이지를 렌더링한다.
 */

import { h } from "../../index.js";
import { PageHeader } from "../components/PageHeader.js";
import { CollectionToolbar } from "../components/CollectionToolbar.js";
import { CardTile } from "../components/CardTile.js";

function renderCards(props) {
  // 빈 결과 상태를 별도로 처리해 검색/필터 결과가 0개일 때도
  // 사용자가 앱이 고장났다고 느끼지 않게 한다.
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
  // CollectionPage는 카드 앱의 작업 중심 화면이다.
  // 검색, 필터, 정렬, 선택, 즐겨찾기 변경이 모두 여기서 자주 일어난다.
  const rowHeight = props.rowHeight ?? 430;
  const contentHeight = props.contentHeight ?? rowHeight;
  const windowOffset = props.windowOffset ?? 0;

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
      visibleCount: props.visibleCount,
      renderedCount: props.renderedCount,
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
    props.visibleCount === 0
      ? h("section", { id: "collection-card-grid", className: "card-grid" }, ...renderCards(props))
      : h("section", {
        id: "collection-scroll-area",
        className: "collection-scroll-area",
        onScroll: props.onViewportScroll,
      },
      h("div", {
        className: "collection-virtual-canvas",
        style: `height: ${contentHeight}px;`,
      },
      h("div", {
        className: "collection-virtual-window",
        style: `transform: translateY(${windowOffset}px);`,
      },
      h("section", {
        id: "collection-card-grid",
        className: "card-grid collection-virtual-grid",
        style: `--collection-columns: ${props.cardsPerRow}; --collection-row-height: ${rowHeight}px;`,
      }, ...renderCards(props)))))
  );
}
