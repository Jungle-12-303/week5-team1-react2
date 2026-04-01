/*
 * Responsibility:
 * - 컬렉션 페이지의 검색, 필터, 정렬 컨트롤을 렌더링한다.
 */

import { h } from "../../index.js";

function renderTypeOptions(typeLabels) {
  // select의 option 목록도 루트 상수에서 받아오므로,
  // 타입 체계가 바뀌어도 이 컴포넌트는 렌더링 역할만 유지하면 된다.
  return [
    h("option", { key: "all", value: "all" }, "All Types"),
    ...Object.entries(typeLabels).map(([value, label]) =>
      h("option", { key: value, value }, label)
    ),
  ];
}

function renderSortOptions() {
  return [
    h("option", { key: "number", value: "number" }, "Number"),
    h("option", { key: "name", value: "name" }, "Name"),
    h("option", { key: "favorites", value: "favorites" }, "Favorites First"),
  ];
}

export function CollectionToolbar(props) {
  // 이 툴바는 실제 상태를 소유하지 않는다.
  // 입력 값과 변경 핸들러는 모두 루트 App이 내려주기 때문에 stateless 규칙을 지킨다.
  return h("section", { className: "panel-card toolbar-card" },
    h("div", { className: "panel-heading" },
      h("h2", null, "Collection Controls"),
      h("p", {
        id: "collection-result-count",
      }, props.renderedCount < props.visibleCount
        ? `${props.visibleCount} matched · ${props.renderedCount} cards rendered in view / ${props.totalCount} loaded`
        : `${props.visibleCount} / ${props.totalCount} cards visible`)
    ),
    h("div", { className: "toolbar-grid" },
      h("label", { className: "field" },
        h("span", { className: "field-label" }, "Search"),
        h("input", {
          id: "collection-search-input",
          value: props.searchKeyword,
          onInput: props.onSearchInput,
          placeholder: "Search by card name",
        })
      ),
      h("label", { className: "field" },
        h("span", { className: "field-label" }, "Type"),
        h("select", {
          id: "collection-type-filter",
          value: props.typeFilter,
          onChange: props.onTypeFilterChange,
        }, ...renderTypeOptions(props.typeLabels))
      ),
      h("label", { className: "field" },
        h("span", { className: "field-label" }, "Sort"),
        h("select", {
          id: "collection-sort-select",
          value: props.sortMode,
          onChange: props.onSortChange,
        }, ...renderSortOptions())
      ),
      h("label", { className: "checkbox-field toolbar-checkbox" },
        h("input", {
          id: "collection-favorites-only",
          type: "checkbox",
          checked: props.favoritesOnly,
          onChange: props.onFavoritesToggle,
        }),
        h("span", null, "Favorites only")
      )
    )
  );
}
