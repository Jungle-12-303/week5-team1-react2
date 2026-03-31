/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 서비스의 루트 상태와 페이지 전환을 관리한다.
 */

import { h, useEffect, useMemo, useState } from "../index.js";
import { CARD_LIBRARY, DEFAULT_SETTINGS, PAGE_META, TYPE_LABELS } from "./data/cardLibrary.js";
import { AppShell } from "./components/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { DetailPage } from "./pages/DetailPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

function canUseLocalStorage() {
  return typeof localStorage !== "undefined";
}

function cloneDefaultCards() {
  return CARD_LIBRARY.map((card) => ({ ...card, types: card.types.slice() }));
}

function readStoredJson(key) {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function parseStoredSettings() {
  const parsed = readStoredJson("card-showcase-settings");

  if (!parsed || typeof parsed !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    defaultPage: parsed.defaultPage ?? DEFAULT_SETTINGS.defaultPage,
    defaultSortMode: parsed.defaultSortMode ?? DEFAULT_SETTINGS.defaultSortMode,
    tiltEnabled: parsed.tiltEnabled ?? DEFAULT_SETTINGS.tiltEnabled,
    glareEnabled: parsed.glareEnabled ?? DEFAULT_SETTINGS.glareEnabled,
    highResImage: parsed.highResImage ?? DEFAULT_SETTINGS.highResImage,
  };
}

function parseStoredCards() {
  const parsed = readStoredJson("card-showcase-cards");

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return cloneDefaultCards();
  }

  return parsed.map((card) => ({
    ...card,
    types: Array.isArray(card.types) ? card.types.slice() : [],
  }));
}

function createPageItems(pages) {
  return Object.keys(pages).reduce((result, page) => {
    result[page] = { label: pages[page].label };
    return result;
  }, {});
}

function sortCards(cards, sortMode) {
  const nextCards = cards.slice();

  nextCards.sort((left, right) => {
    if (sortMode === "name") {
      return left.name.localeCompare(right.name, "en");
    }

    if (sortMode === "favorites") {
      const favoriteDelta = Number(right.isFavorite) - Number(left.isFavorite);

      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }
    }

    return Number(left.number) - Number(right.number);
  });

  return nextCards;
}

function filterCards(cards, filters) {
  const normalizedKeyword = filters.searchKeyword.trim().toLowerCase();

  return cards.filter((card) => {
    if (filters.typeFilter !== "all" && !card.types.includes(filters.typeFilter)) {
      return false;
    }

    if (filters.favoritesOnly && !card.isFavorite) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return `${card.name} ${card.number}`.toLowerCase().includes(normalizedKeyword);
  });
}

function buildTypeSummary(cards) {
  return Object.entries(TYPE_LABELS)
    .map(([type, label]) => ({
      type,
      label,
      count: cards.filter((card) => card.types.includes(type)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);
}

function resolveTopTypeMessage(typeSummary) {
  if (typeSummary.length === 0) {
    return "Type insight will appear as soon as cards are available.";
  }

  const leader = typeSummary[0];
  return `${leader.label} leads the collection with ${leader.count} visible cards.`;
}

function getCardIndex(cards, selectedCardId) {
  return cards.findIndex((card) => card.id === selectedCardId);
}

function applyInteractiveStyle(element, options) {
  if (!element) {
    return;
  }

  const tilt = options.tiltEnabled
    ? `transform: perspective(960px) rotateX(${options.rotateX}deg) rotateY(${options.rotateY}deg) scale3d(1.02, 1.02, 1.02);`
    : "transform: perspective(960px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1);";
  const glare = options.glareEnabled
    ? `--glare-x: ${options.glareX}%; --glare-y: ${options.glareY}%; --glare-opacity: 0.92; --glare-rotation: ${options.glareRotation}deg; --surface-shift: ${options.surfaceShift}%;`
    : "--glare-x: 50%; --glare-y: 50%; --glare-opacity: 0; --glare-rotation: 0deg; --surface-shift: 0%;";
  const light = `--light-x: ${options.glareX}%; --light-y: ${options.glareY}%;`;

  element.setAttribute("style", `${tilt} ${glare} ${light}`);
}

export function App() {
  const [settings, setSettings] = useState(() => parseStoredSettings());
  const [currentPage, setCurrentPage] = useState(() => parseStoredSettings().defaultPage ?? "dashboard");
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState(() => parseStoredSettings().defaultSortMode ?? "number");
  const [lastAction, setLastAction] = useState("Loading the card showcase library.");

  const pageItems = useMemo(() => createPageItems(PAGE_META), []);
  const visibleCards = useMemo(() => sortCards(filterCards(cards, {
    searchKeyword,
    typeFilter,
    favoritesOnly,
  }), sortMode), [cards, favoritesOnly, searchKeyword, sortMode, typeFilter]);
  const favoriteCount = useMemo(() => cards.filter((card) => card.isFavorite).length, [cards]);
  const selectedCard = useMemo(() => cards.find((card) => card.id === selectedCardId) ?? null, [cards, selectedCardId]);
  const typeSummary = useMemo(() => buildTypeSummary(visibleCards), [visibleCards]);
  const spotlightCard = useMemo(() => selectedCard ?? visibleCards[0] ?? cards[0] ?? null, [cards, selectedCard, visibleCards]);
  const topTypeMessage = useMemo(() => resolveTopTypeMessage(typeSummary), [typeSummary]);
  const relatedCards = useMemo(() => {
    if (!selectedCard) {
      return visibleCards.slice(0, 3);
    }

    return visibleCards.filter((card) => card.id !== selectedCard.id).slice(0, 3);
  }, [selectedCard, visibleCards]);

  useEffect(() => {
    document.title = `${PAGE_META[currentPage]?.title ?? "Showcase"} · Prism Dex`;

    return () => {
      document.title = "Week5 React-like Runtime";
    };
  }, [currentPage]);

  useEffect(() => {
    const storedCards = parseStoredCards();
    setCards(storedCards);
    setSelectedCardId(storedCards[0]?.id ?? null);
    setIsLoading(false);
    setLoadError(null);
    setLastAction(`Loaded ${storedCards.length} cards into the showcase.`);
  }, []);

  useEffect(() => {
    if (!canUseLocalStorage() || cards.length === 0) {
      return;
    }

    localStorage.setItem("card-showcase-cards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    if (!canUseLocalStorage()) {
      return;
    }

    localStorage.setItem("card-showcase-settings", JSON.stringify(settings));
  }, [settings]);

  function handleNavigate(page) {
    if (page === "detail" && !selectedCardId) {
      setCurrentPage("collection");
      return;
    }

    setCurrentPage(page);
  }

  function handleSearchInput(event) {
    setSearchKeyword(event.target.value);
    setLastAction(`Searching collection for "${event.target.value || "all cards"}".`);
  }

  function handleTypeFilterChange(event) {
    setTypeFilter(event.target.value);
    setLastAction(`Type filter changed to ${event.target.value}.`);
  }

  function handleFavoritesToggle(event) {
    setFavoritesOnly(Boolean(event.target.checked));
    setLastAction(Boolean(event.target.checked) ? "Collection is now filtered to saved cards." : "Collection now shows all cards again.");
  }

  function handleSortChange(event) {
    setSortMode(event.target.value);
    setLastAction(`Collection sort changed to ${event.target.value}.`);
  }

  function handleSelectCard(cardId) {
    const target = cards.find((card) => card.id === cardId);

    if (!target) {
      return;
    }

    setSelectedCardId(cardId);
    setLastAction(`Selected ${target.name} for the detail spotlight.`);
  }

  function handleSelectAndOpen(cardId) {
    handleSelectCard(cardId);
    setCurrentPage("detail");
  }

  function handleToggleFavorite(cardId) {
    let nextAction = "Updated a saved card state.";

    setCards((previousCards) =>
      previousCards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }

        const nextFavorite = !card.isFavorite;
        nextAction = nextFavorite
          ? `Saved ${card.name} to favorites.`
          : `Removed ${card.name} from favorites.`;

        return {
          ...card,
          isFavorite: nextFavorite,
        };
      })
    );

    setLastAction(nextAction);
  }

  function handleDefaultPageChange(event) {
    const nextPage = event.target.value;

    setSettings((previousValue) => ({
      ...previousValue,
      defaultPage: nextPage,
    }));
    setCurrentPage(nextPage);
    setLastAction(`Default page changed to ${nextPage}.`);
  }

  function handleDefaultSortChange(event) {
    const nextSortMode = event.target.value;

    setSettings((previousValue) => ({
      ...previousValue,
      defaultSortMode: nextSortMode,
    }));
    setSortMode(nextSortMode);
    setLastAction(`Default sort changed to ${nextSortMode}.`);
  }

  function handleTiltToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      tiltEnabled: nextValue,
    }));
    setLastAction(nextValue ? "Card tilt effect enabled." : "Card tilt effect disabled.");
  }

  function handleGlareToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      glareEnabled: nextValue,
    }));
    setLastAction(nextValue ? "Card glare effect enabled." : "Card glare effect disabled.");
  }

  function handleHighResToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      highResImage: nextValue,
    }));
    setLastAction(nextValue ? "High-resolution art enabled." : "Thumbnail art mode enabled.");
  }

  function handleResetDemo() {
    const nextCards = cloneDefaultCards();

    setCards(nextCards);
    setSelectedCardId(nextCards[0]?.id ?? null);
    setSearchKeyword("");
    setTypeFilter("all");
    setFavoritesOnly(false);
    setSortMode(settings.defaultSortMode);
    setLoadError(null);
    setIsLoading(false);
    setLastAction("Card showcase reset to the default gallery.");
  }

  function handleRetryLoad() {
    setIsLoading(true);
    setLoadError(null);
    const nextCards = cloneDefaultCards();
    setCards(nextCards);
    setSelectedCardId(nextCards[0]?.id ?? null);
    setIsLoading(false);
    setLastAction("Reloaded the card showcase dataset.");
  }

  function handleSelectNext() {
    if (visibleCards.length === 0) {
      return;
    }

    const currentIndex = getCardIndex(visibleCards, selectedCardId);
    const nextIndex = currentIndex === -1 || currentIndex === visibleCards.length - 1 ? 0 : currentIndex + 1;
    handleSelectCard(visibleCards[nextIndex].id);
  }

  function handlePointerMove(event) {
    const element = event.currentTarget;

    if (!element || typeof element.getBoundingClientRect !== "function") {
      return;
    }

    const rect = element.getBoundingClientRect();
    const relativeX = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
    const relativeY = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
    const rotateY = (relativeX - 0.5) * 18;
    const rotateX = (0.5 - relativeY) * 16;

    applyInteractiveStyle(element, {
      tiltEnabled: settings.tiltEnabled,
      glareEnabled: settings.glareEnabled,
      rotateX,
      rotateY,
      glareX: Math.round(relativeX * 100),
      glareY: Math.round(relativeY * 100),
      glareRotation: Math.round((relativeX - 0.5) * 36),
      surfaceShift: Math.round((relativeY - 0.5) * 18),
    });
  }

  function handlePointerLeave(event) {
    const element = event.currentTarget;

    applyInteractiveStyle(element, {
      tiltEnabled: false,
      glareEnabled: false,
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
    });
  }

  function renderCurrentPage() {
    if (isLoading) {
      return h("section", { className: "page-stack", id: "page-loading" },
        h("article", { className: "panel-card empty-detail-card" },
          h("h1", null, "Loading card showcase"),
          h("p", { id: "loading-state" }, "Preparing the gallery from external image-ready card records.")
        )
      );
    }

    if (loadError) {
      return h("section", { className: "page-stack", id: "page-error" },
        h("article", { className: "panel-card empty-detail-card" },
          h("h1", null, "Unable to load cards"),
          h("p", { id: "error-state" }, loadError),
          h("button", {
            id: "retry-load-button",
            className: "primary-button",
            onClick: handleRetryLoad,
          }, "Retry")
        )
      );
    }

    if (currentPage === "collection") {
      return h(CollectionPage, {
        onNavigate: handleNavigate,
        cards: visibleCards,
        totalCount: cards.length,
        searchKeyword,
        typeFilter,
        favoritesOnly,
        sortMode,
        typeLabels: TYPE_LABELS,
        settings,
        selectedCardId,
        emptyMessage: "No cards match the current collection filters.",
        onSearchInput: handleSearchInput,
        onTypeFilterChange: handleTypeFilterChange,
        onFavoritesToggle: handleFavoritesToggle,
        onSortChange: handleSortChange,
        onSelectCard: handleSelectAndOpen,
        onToggleFavorite: handleToggleFavorite,
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
      });
    }

    if (currentPage === "detail") {
      return h(DetailPage, {
        card: selectedCard,
        relatedCards,
        settings,
        onNavigate: handleNavigate,
        onSelectCard: handleSelectAndOpen,
        onToggleFavorite: handleToggleFavorite,
        onSelectNext: handleSelectNext,
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
      });
    }

    if (currentPage === "settings") {
      return h(SettingsPage, {
        pages: pageItems,
        settings,
        onDefaultPageChange: handleDefaultPageChange,
        onDefaultSortChange: handleDefaultSortChange,
        onTiltToggle: handleTiltToggle,
        onGlareToggle: handleGlareToggle,
        onHighResToggle: handleHighResToggle,
        onResetDemo: handleResetDemo,
      });
    }

    return h(DashboardPage, {
      totalCount: cards.length,
      favoriteCount,
      visibleCount: visibleCards.length,
      selectedCard,
      spotlightCard,
      lastAction,
      topTypeMessage,
      typeSummary,
      settings,
      onNavigate: handleNavigate,
      onSelectCard: handleSelectAndOpen,
      onToggleFavorite: handleToggleFavorite,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    });
  }

  return h(AppShell, {
    currentPage,
    pages: pageItems,
    onNavigate: handleNavigate,
    lastAction,
  }, renderCurrentPage());
}
