/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 서비스의 루트 상태, 데이터 로딩, 페이지 전환을 관리한다.
 */

import { h, useEffect, useMemo, useState } from "../index.js";
import { CARD_LIBRARY, DEFAULT_SETTINGS, PAGE_META, TYPE_LABELS } from "./data/cardLibrary.js";
import { fetchPokemonCatalog, fetchPokemonDetail } from "./data/pokeApiClient.js";
import { AppShell } from "./components/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { DetailPage } from "./pages/DetailPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const CATALOG_CACHE_KEY = "card-showcase-catalog-cache";
const MAX_NATIONAL_DEX = 1025;

function canUseLocalStorage() {
  return typeof localStorage !== "undefined";
}

function getDataMode() {
  return globalThis.__CARD_SHOWCASE_DATA_MODE__ === "local" ? "local" : "remote";
}

function cloneDefaultCards() {
  return CARD_LIBRARY.map((card) => ({
    ...card,
    types: card.types.slice(),
    baseStats: card.baseStats ? { ...card.baseStats } : null,
  }));
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

function readStoredFavoriteIds() {
  const explicitIds = readStoredJson("card-showcase-favorites");

  if (Array.isArray(explicitIds)) {
    return explicitIds;
  }

  const legacyCards = readStoredJson("card-showcase-cards");

  if (!Array.isArray(legacyCards)) {
    return [];
  }

  return legacyCards.filter((card) => card && card.isFavorite).map((card) => card.id);
}

function readCatalogCache() {
  const parsed = readStoredJson(CATALOG_CACHE_KEY);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  return parsed.map((card) => ({
    ...card,
    types: Array.isArray(card.types) ? card.types.slice() : [],
    baseStats: card.baseStats ? { ...card.baseStats } : null,
    isFavorite: false,
  })).filter((card) => Number(card.number) <= MAX_NATIONAL_DEX);
}

function writeCatalogCache(cards) {
  if (!canUseLocalStorage() || !Array.isArray(cards) || cards.length === 0) {
    return;
  }

  const cachePayload = cards.map((card) => ({
    ...card,
    isFavorite: false,
  }));

  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cachePayload));
}

function mergeFavoriteFlags(cards, favoriteIds) {
  const favoriteSet = new Set(favoriteIds);

  return cards.map((card) => ({
    ...card,
    types: Array.isArray(card.types) ? card.types.slice() : [],
    baseStats: card.baseStats ? { ...card.baseStats } : null,
    isFavorite: favoriteSet.has(card.id),
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
    ? `--glare-opacity: 0.84; --glare-strength: 1.06; --edge-glow-opacity: 0.42; --glare-rotation: ${options.glareRotation}deg; --surface-shift: ${options.surfaceShift}%; --shine-shift-x: ${options.shineShiftX}%; --shine-shift-y: ${options.shineShiftY}%; --wave-skew: ${options.waveSkew}deg; --holo-x: ${options.holoX}%; --holo-y: ${options.holoY}%; --sparkle-opacity: ${options.sparkleOpacity};`
    : "--glare-opacity: 0.3; --glare-strength: 0.42; --edge-glow-opacity: 0.18; --glare-rotation: -6deg; --surface-shift: 0%; --shine-shift-x: 0%; --shine-shift-y: 0%; --wave-skew: 0deg; --holo-x: 50%; --holo-y: 50%; --sparkle-opacity: 0.22;";

  element.setAttribute("style", `${tilt} ${glare}`);
}

function mergeCardWithDetail(card, detail) {
  if (!card) {
    return null;
  }

  if (!detail) {
    return card;
  }

  return {
    ...card,
    types: detail.types?.length ? detail.types : card.types,
    height: detail.height ?? card.height,
    weight: detail.weight ?? card.weight,
    baseStats: detail.baseStats ?? card.baseStats,
    flavor: detail.flavor ?? card.flavor,
  };
}

function createLocalDetail(card) {
  return {
    types: card.types.slice(),
    height: card.height,
    weight: card.weight,
    baseStats: card.baseStats ? { ...card.baseStats } : null,
    flavor: card.flavor,
  };
}

export function App() {
  const initialSettings = parseStoredSettings();
  const [settings, setSettings] = useState(() => initialSettings);
  const [currentPage, setCurrentPage] = useState(() => initialSettings.defaultPage ?? "dashboard");
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState(() => initialSettings.defaultSortMode ?? "number");
  const [lastAction, setLastAction] = useState("Loading the card showcase library.");
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [detailById, setDetailById] = useState({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [catalogNotice, setCatalogNotice] = useState(null);

  const pageItems = useMemo(() => createPageItems(PAGE_META), []);
  const visibleCards = useMemo(() => sortCards(filterCards(cards, {
    searchKeyword,
    typeFilter,
    favoritesOnly,
  }), sortMode), [cards, favoritesOnly, searchKeyword, sortMode, typeFilter]);
  const favoriteCount = useMemo(() => cards.filter((card) => card.isFavorite).length, [cards]);
  const selectedCardBase = useMemo(() => cards.find((card) => card.id === selectedCardId) ?? null, [cards, selectedCardId]);
  const selectedCard = useMemo(() => mergeCardWithDetail(selectedCardBase, selectedCardBase ? detailById[selectedCardBase.id] : null), [detailById, selectedCardBase]);
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
    let isActive = true;

    async function loadCatalog() {
      const favoriteIds = readStoredFavoriteIds();
      const dataMode = getDataMode();
      const cachedCatalog = dataMode === "local" ? [] : readCatalogCache();

      setIsLoading(true);
      setLoadError(null);
      setCatalogNotice(null);

      if (cachedCatalog.length > 0) {
        const cachedCards = mergeFavoriteFlags(cachedCatalog, favoriteIds);

        if (isActive) {
          setCards(cachedCards);
          setSelectedCardId((previousValue) =>
            cachedCards.some((card) => card.id === previousValue) ? previousValue : cachedCards[0]?.id ?? null
          );
          setIsLoading(false);
          setLastAction(`Loaded ${cachedCards.length} cached cards while refreshing the remote catalog.`);
        }
      }

      try {
        const remoteCards = dataMode === "local"
          ? cloneDefaultCards()
          : await fetchPokemonCatalog();
        const nextCards = mergeFavoriteFlags(remoteCards, favoriteIds);

        if (!isActive) {
          return;
        }

        setCards(nextCards);
        setSelectedCardId((previousValue) =>
          nextCards.some((card) => card.id === previousValue) ? previousValue : nextCards[0]?.id ?? null
        );
        setIsLoading(false);
        setCatalogNotice(null);
        setLastAction(`Loaded ${nextCards.length} cards into the showcase.`);

        if (dataMode !== "local") {
          writeCatalogCache(remoteCards);
        }
      } catch (error) {
        const fallbackCards = mergeFavoriteFlags(cloneDefaultCards(), favoriteIds);

        if (!isActive) {
          return;
        }

        const nextCards = cachedCatalog.length > 0 ? mergeFavoriteFlags(cachedCatalog, favoriteIds) : fallbackCards;

        setCards(nextCards);
        setSelectedCardId((previousValue) =>
          nextCards.some((card) => card.id === previousValue) ? previousValue : nextCards[0]?.id ?? null
        );
        setIsLoading(false);
        setLoadError(null);
        setCatalogNotice(
          cachedCatalog.length > 0
            ? "Remote catalog refresh failed. Showing the last cached collection snapshot."
            : "Remote catalog failed to load. Showing the built-in fallback gallery."
        );
        setLastAction(`Remote catalog unavailable. ${error.message}`);
      }
    }

    loadCatalog();

    return () => {
      isActive = false;
    };
  }, [catalogVersion]);

  useEffect(() => {
    if (!canUseLocalStorage()) {
      return;
    }

    const favoriteIds = cards.filter((card) => card.isFavorite).map((card) => card.id);
    localStorage.setItem("card-showcase-favorites", JSON.stringify(favoriteIds));
  }, [cards]);

  useEffect(() => {
    if (!canUseLocalStorage()) {
      return;
    }

    localStorage.setItem("card-showcase-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let isActive = true;

    if (!selectedCardBase) {
      setIsDetailLoading(false);
      setDetailError(null);
      return () => {
        isActive = false;
      };
    }

    if (detailById[selectedCardBase.id]) {
      setIsDetailLoading(false);
      setDetailError(null);
      return () => {
        isActive = false;
      };
    }

    if (getDataMode() === "local") {
      setDetailById((previousValue) => ({
        ...previousValue,
        [selectedCardBase.id]: createLocalDetail(selectedCardBase),
      }));
      setIsDetailLoading(false);
      setDetailError(null);
      return () => {
        isActive = false;
      };
    }

    async function loadDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const nextDetail = await fetchPokemonDetail(selectedCardBase);

        if (!isActive) {
          return;
        }

        setDetailById((previousValue) => ({
          ...previousValue,
          [selectedCardBase.id]: nextDetail,
        }));
        setIsDetailLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setIsDetailLoading(false);
        setDetailError(`Unable to load full species details for ${selectedCardBase.name}.`);
        setDetailById((previousValue) => ({
          ...previousValue,
          [selectedCardBase.id]: createLocalDetail(selectedCardBase),
        }));
        setLastAction(`Loaded ${selectedCardBase.name} with a fallback detail profile. ${error.message}`);
      }
    }

    loadDetail();

    return () => {
      isActive = false;
    };
  }, [detailById, selectedCardBase]);

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
    const nextSettings = { ...DEFAULT_SETTINGS };
    const nextCards = cards.map((card) => ({
      ...card,
      isFavorite: false,
    }));

    setCards(nextCards);
    setCurrentPage(nextSettings.defaultPage);
    setSearchKeyword("");
    setTypeFilter("all");
    setFavoritesOnly(false);
    setSortMode(nextSettings.defaultSortMode);
    setSettings(nextSettings);
    setLoadError(null);
    setDetailError(null);
    setCatalogNotice(null);
    setLastAction("Card showcase reset to the default gallery state.");
  }

  function handleRetryLoad() {
    setDetailById({});
    setCatalogVersion((previousValue) => previousValue + 1);
    setLastAction("Reloading the card showcase dataset.");
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
    const rotateY = (relativeX - 0.5) * 14;
    const rotateX = (0.5 - relativeY) * 12;

    applyInteractiveStyle(element, {
      tiltEnabled: settings.tiltEnabled,
      glareEnabled: settings.glareEnabled,
      rotateX,
      rotateY,
      glareRotation: Math.round((relativeX - 0.5) * 22),
      surfaceShift: Math.round((relativeY - 0.5) * 12),
      shineShiftX: Math.round((relativeX - 0.5) * 28),
      shineShiftY: Math.round((relativeY - 0.5) * 12),
      waveSkew: Math.round((relativeX - 0.5) * 10),
      holoX: Math.round(relativeX * 100),
      holoY: Math.round(relativeY * 100),
      sparkleOpacity: (0.34 + Math.abs(relativeX - 0.5) * 0.42 + Math.abs(relativeY - 0.5) * 0.22).toFixed(3),
    });
  }

  function handlePointerLeave(event) {
    const element = event.currentTarget;

    applyInteractiveStyle(element, {
      tiltEnabled: false,
      glareEnabled: false,
      rotateX: 0,
      rotateY: 0,
      glareRotation: 0,
      surfaceShift: 0,
      shineShiftX: 0,
      shineShiftY: 0,
      waveSkew: 0,
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
        isDetailLoading,
        detailError,
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
    catalogNotice,
  }, renderCurrentPage());
}
