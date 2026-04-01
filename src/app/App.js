/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 서비스의 루트 상태, 데이터 로딩, 페이지 전환을 관리한다.
 */

import { h, useEffect, useMemo, useState } from "../index.js";
import { CARD_LIBRARY, DEFAULT_SETTINGS, PAGE_META } from "./data/cardLibrary.js";
import {
  fetchPokemonCatalog,
  fetchPokemonDetail,
  fetchPokemonLocalizedNames,
  fetchPokemonPreviewCatalog,
} from "./data/pokeApiClient.js";
import { getLocalPokemonName } from "./data/pokemon-names/index.js";
import { getLocaleMessages, LANGUAGE_OPTIONS, resolveSupportedLocale } from "./i18n/messages.js";
import { AppShell } from "./components/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { DetailPage } from "./pages/DetailPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const CATALOG_CACHE_KEY = "card-showcase-catalog-cache";
const MAX_NATIONAL_DEX = 1025;
const COLLECTION_ROW_HEIGHT = 430;
const COLLECTION_BUFFER_ROWS = 1;
const COLLECTION_FALLBACK_VIEWPORT_HEIGHT = 720;
const COLLECTION_FALLBACK_VIEWPORT_WIDTH = 880;
const INTERACTIVE_MOTION = Object.freeze({
  perspective: 820,
  hoverScale: 1.028,
  rotateY: 18,
  rotateX: 16,
  glareRotation: 30,
  surfaceShift: 16,
  shineShiftX: 38,
  shineShiftY: 18,
  waveSkew: 14,
});

function canUseLocalStorage() {
  // 브라우저가 localStorage를 제공하지 않는 환경(예: 일부 테스트 환경)에서도
  // 앱이 죽지 않도록 먼저 기능 존재 여부를 확인한다.
  return typeof localStorage !== "undefined";
}

function getDataMode() {
  // 테스트에서는 네트워크 없이도 안정적으로 동작해야 하므로,
  // 전역 플래그로 "local" 모드를 강제할 수 있게 해 둔다.
  return globalThis.__CARD_SHOWCASE_DATA_MODE__ === "local" ? "local" : "remote";
}

function cloneDefaultCards() {
  // 샘플 카드 배열을 그대로 재사용하면 즐겨찾기 변경 같은 상태가 원본 상수까지
  // 오염될 수 있다. 그래서 렌더에 쓸 때는 항상 복사본을 만든다.
  return CARD_LIBRARY.map((card) => ({
    ...card,
    types: card.types.slice(),
    baseStats: card.baseStats ? { ...card.baseStats } : null,
  }));
}

function resolveBrowserLocale() {
  if (typeof globalThis.__CARD_SHOWCASE_LOCALE__ === "string") {
    return resolveSupportedLocale(globalThis.__CARD_SHOWCASE_LOCALE__);
  }

  if (typeof navigator === "undefined") {
    return DEFAULT_SETTINGS.locale;
  }

  return resolveSupportedLocale([navigator.language, ...(navigator.languages ?? [])]);
}

function readStoredJson(key) {
  // localStorage 파싱 실패는 사용자 데이터 손상이나 브라우저 정책으로 쉽게
  // 생길 수 있다. 여기서는 예외를 밖으로 던지지 않고 "없음"으로 취급한다.
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
  // 저장된 설정은 일부 필드만 있을 수 있으므로, 문서에 정의된 기본 설정과
  // 병합해 항상 완전한 settings 객체를 만든다.
  const parsed = readStoredJson("card-showcase-settings");

  if (!parsed || typeof parsed !== "object") {
    return {
      ...DEFAULT_SETTINGS,
      locale: resolveBrowserLocale(),
    };
  }

  return {
    defaultPage: parsed.defaultPage ?? DEFAULT_SETTINGS.defaultPage,
    defaultSortMode: parsed.defaultSortMode ?? DEFAULT_SETTINGS.defaultSortMode,
    locale: resolveSupportedLocale(parsed.locale ?? resolveBrowserLocale()),
    tiltEnabled: parsed.tiltEnabled ?? DEFAULT_SETTINGS.tiltEnabled,
    glareEnabled: parsed.glareEnabled ?? DEFAULT_SETTINGS.glareEnabled,
    highResImage: parsed.highResImage ?? DEFAULT_SETTINGS.highResImage,
  };
}

function readStoredFavoriteIds() {
  // 현재 버전은 favorite id 목록만 저장하지만,
  // 예전 버전과의 호환을 위해 legacy 카드 배열도 읽을 수 있게 유지한다.
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
  // 원격 카탈로그를 다시 불러오기 전에 이전 성공 결과를 보여주기 위한 캐시다.
  // 단, 문서 기준으로 정규 전국도감 1025번까지만 허용하므로 그 범위를 넘는 카드는 버린다.
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
  // 캐시는 "목록을 빠르게 다시 보여주기 위한 최소 데이터"라는 성격이므로
  // 세션성 상태인 isFavorite은 저장하지 않는다.
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
  // 원격 데이터와 로컬 즐겨찾기 상태를 합치는 단계다.
  // 외부 API 응답은 "카드 자체 정보"만 담고 있고,
  // 사용자의 즐겨찾기 여부는 앱이 따로 덧씌운다.
  const favoriteSet = new Set(favoriteIds);

  return cards.map((card) => ({
    ...card,
    types: Array.isArray(card.types) ? card.types.slice() : [],
    baseStats: card.baseStats ? { ...card.baseStats } : null,
    isFavorite: favoriteSet.has(card.id),
  }));
}

function createPageItems(pages, localizedPages) {
  // AppShell과 네비게이션은 전체 PAGE_META가 아니라,
  // label만 있는 단순 구조면 충분하므로 표시용 데이터만 추린다.
  return Object.keys(pages).reduce((result, page) => {
    result[page] = {
      label: localizedPages?.[page]?.label ?? pages[page].label,
      title: localizedPages?.[page]?.title ?? pages[page].title,
    };
    return result;
  }, {});
}

function createCatalogStatusMessage(copy, loadedCount, isStreamingCatalog) {
  if (isStreamingCatalog) {
    return copy.actions.previewLoaded(loadedCount);
  }

  return copy.actions.catalogLoaded(loadedCount);
}

function resolveCollectionColumnCount(width) {
  if (width <= 560) {
    return 1;
  }

  if (width <= 820) {
    return 2;
  }

  if (width <= 1180) {
    return 3;
  }

  return 4;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sortCards(cards, sortMode, locale) {
  // 정렬은 원본 배열을 직접 바꾸지 않도록 항상 복사본에서 수행한다.
  // 그래야 useMemo와 상태 비교가 더 예측 가능해진다.
  const nextCards = cards.slice();

  nextCards.sort((left, right) => {
    if (sortMode === "name") {
      return (left.displayName ?? left.name).localeCompare((right.displayName ?? right.name), locale);
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
  // 검색, 타입 필터, 즐겨찾기 필터를 한 곳에 모아 두면
  // 컬렉션 페이지가 "어떤 카드가 보여야 하는지"를 읽기 쉬워진다.
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

    return `${card.displayName ?? card.name} ${card.name} ${card.number}`.toLowerCase().includes(normalizedKeyword);
  });
}

function buildTypeSummary(cards, typeLabels) {
  // 대시보드 요약 패널은 cards 전체가 아니라 "현재 보이는 카드"를 기준으로
  // 계산해야 사용자가 필터 결과와 요약 수치를 함께 이해할 수 있다.
  return Object.entries(typeLabels)
    .map(([type, label]) => ({
      type,
      label,
      count: cards.filter((card) => card.types.includes(type)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);
}

function resolveTopTypeMessage(typeSummary) {
  // 대시보드 설명 문구도 파생 데이터다.
  // 미리 문자열로 만들어 두면 페이지 컴포넌트는 렌더링 역할에만 집중할 수 있다.
  if (typeSummary.length === 0) {
    return null;
  }

  return typeSummary[0];
}

function getCardIndex(cards, selectedCardId) {
  // 상세 페이지의 "Next Card" 버튼은 현재 선택 카드가 목록에서 몇 번째인지 알아야 한다.
  return cards.findIndex((card) => card.id === selectedCardId);
}

function createInteractivePresentation(overrides = {}) {
  // interactivePresentation은 "카드 표면 효과를 만들기 위한 임시 시각 값 모음"이다.
  // 앱의 의미 있는 데이터(cards, settings, selectedCardId)와 달리,
  // rotateX/shineShift 같은 값은 카드 표면을 얼마나 기울이고 빛낼지만 설명한다.
  return {
    active: false,
    rotateX: 0,
    rotateY: 0,
    glareRotation: 0,
    surfaceShift: 0,
    shineShiftX: 0,
    shineShiftY: 0,
    waveSkew: 0,
    holoX: 50,
    holoY: 50,
    sparkleOpacity: 0.22,
    ...overrides,
  };
}

function createInteractivePresentationFromPointerEvent(event) {
  const element = event.currentTarget;

  if (!element || typeof element.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const relativeX = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
  const relativeY = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;

  return createInteractivePresentation({
    active: true,
    rotateY: (relativeX - 0.5) * INTERACTIVE_MOTION.rotateY,
    rotateX: (0.5 - relativeY) * INTERACTIVE_MOTION.rotateX,
    glareRotation: Math.round((relativeX - 0.5) * INTERACTIVE_MOTION.glareRotation),
    surfaceShift: Math.round((relativeY - 0.5) * INTERACTIVE_MOTION.surfaceShift),
    shineShiftX: Math.round((relativeX - 0.5) * INTERACTIVE_MOTION.shineShiftX),
    shineShiftY: Math.round((relativeY - 0.5) * INTERACTIVE_MOTION.shineShiftY),
    waveSkew: Math.round((relativeX - 0.5) * INTERACTIVE_MOTION.waveSkew),
    holoX: Math.round(relativeX * 100),
    holoY: Math.round(relativeY * 100),
    sparkleOpacity: Number(
      (0.34 + Math.abs(relativeX - 0.5) * 0.42 + Math.abs(relativeY - 0.5) * 0.22).toFixed(3)
    ),
  });
}

function createInteractiveStyleValue(presentation, settings) {
  // 이 문자열은 카드 요소의 inline style로 들어가고,
  // 내부 레이어들은 여기서 세팅한 CSS 변수를 상속받아 glare/prism/sparkle 위치를 계산한다.
  const nextPresentation = presentation ?? createInteractivePresentation();
  const tiltEnabled = nextPresentation.active && settings.tiltEnabled;
  const glareEnabled = nextPresentation.active && settings.glareEnabled;
  const tilt = tiltEnabled
    ? `transform: perspective(${INTERACTIVE_MOTION.perspective}px) rotateX(${nextPresentation.rotateX}deg) rotateY(${nextPresentation.rotateY}deg) scale3d(${INTERACTIVE_MOTION.hoverScale}, ${INTERACTIVE_MOTION.hoverScale}, ${INTERACTIVE_MOTION.hoverScale});`
    : `transform: perspective(${INTERACTIVE_MOTION.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1);`;
  const glare = glareEnabled
    ? `--glare-opacity: 0.84; --glare-strength: 1.06; --edge-glow-opacity: 0.42; --glare-rotation: ${nextPresentation.glareRotation}deg; --surface-shift: ${nextPresentation.surfaceShift}%; --shine-shift-x: ${nextPresentation.shineShiftX}%; --shine-shift-y: ${nextPresentation.shineShiftY}%; --wave-skew: ${nextPresentation.waveSkew}deg; --holo-x: ${nextPresentation.holoX}%; --holo-y: ${nextPresentation.holoY}%; --sparkle-opacity: ${nextPresentation.sparkleOpacity};`
    : "--glare-opacity: 0.3; --glare-strength: 0.42; --edge-glow-opacity: 0.18; --glare-rotation: -6deg; --surface-shift: 0%; --shine-shift-x: 0%; --shine-shift-y: 0%; --wave-skew: 0deg; --holo-x: 50%; --holo-y: 50%; --sparkle-opacity: 0.22;";

  return `${tilt} ${glare}`;
}

function applyInteractiveStyle(element, presentation, settings) {
  // 카드 기울기/광택은 초당 매우 자주 바뀌는 고빈도 인터랙션이다.
  // 컬렉션 그리드의 다수 카드에 이것을 useState로 적용하면 루트 앱 전체가 계속 다시 렌더될 수 있으므로,
  // 컬렉션 hover는 DOM 요소에 CSS 변수를 직접 써서 시각 효과만 국소적으로 갱신한다.
  if (!element) {
    return;
  }

  element.setAttribute("style", createInteractiveStyleValue(presentation, settings));
}

function mergeCardWithDetail(card, detail) {
  // 목록 페이지용 간단 데이터(card)와 상세 페이지용 추가 데이터(detail)를 합친다.
  // 이렇게 분리하면 초기 목록 로딩은 가볍게 유지하고,
  // 상세 페이지에 들어갔을 때만 더 많은 정보를 덧붙일 수 있다.
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
    evolutionDexNumbers: detail.evolutionDexNumbers?.length ? detail.evolutionDexNumbers.slice() : [],
  };
}

function createLocalDetail(card) {
  // 원격 상세 로딩이 없거나 실패했을 때도 Detail 페이지가 완전히 비지 않도록
  // 기본 카드 데이터만으로 만들 수 있는 최소 상세 정보를 준비한다.
  return {
    types: card.types.slice(),
    height: card.height,
    weight: card.weight,
    baseStats: card.baseStats ? { ...card.baseStats } : null,
    flavor: card.flavor,
    evolutionDexNumbers: [],
  };
}

function countSharedTypes(leftTypes, rightTypes) {
  if (!Array.isArray(leftTypes) || !Array.isArray(rightTypes)) {
    return 0;
  }

  const rightSet = new Set(rightTypes);
  return leftTypes.reduce((count, type) => count + (rightSet.has(type) ? 1 : 0), 0);
}

function getBaseStatTotal(card) {
  if (!card?.baseStats) {
    return 0;
  }

  return Object.values(card.baseStats).reduce((sum, value) => sum + Number(value || 0), 0);
}

function scoreRelatedCard(selectedCard, candidate) {
  if (!selectedCard || !candidate || selectedCard.id === candidate.id) {
    return Number.NEGATIVE_INFINITY;
  }

  const sharedTypeCount = countSharedTypes(selectedCard.types, candidate.types);
  const statDistance = Math.abs(getBaseStatTotal(selectedCard) - getBaseStatTotal(candidate));
  const dexDistance = Math.abs(Number(selectedCard.number) - Number(candidate.number));

  return sharedTypeCount * 100 - statDistance - dexDistance * 0.25;
}

function buildRelatedCards(selectedCardBase, selectedCardDetail, allCards) {
  const pool = Array.isArray(allCards) ? allCards : [];

  if (!selectedCardBase) {
    return [];
  }

  const selectedCard = mergeCardWithDetail(selectedCardBase, selectedCardDetail);
  const dedupedCards = new Map();

  pool.forEach((card) => {
    if (!card || card.id === selectedCard.id) {
      return;
    }

    if (!dedupedCards.has(card.number)) {
      dedupedCards.set(card.number, card);
    }
  });

  const evolutionDexNumbers = Array.isArray(selectedCardDetail?.evolutionDexNumbers)
    ? selectedCardDetail.evolutionDexNumbers
    : [];
  const evolutionSet = new Set(evolutionDexNumbers.filter((number) => number !== selectedCard.number));
  const evolutionCards = Array.from(dedupedCards.values())
    .filter((card) => evolutionSet.has(card.number))
    .sort(
      (left, right) => evolutionDexNumbers.indexOf(left.number) - evolutionDexNumbers.indexOf(right.number)
    );

  const fallbackCards = Array.from(dedupedCards.values())
    .filter((card) => countSharedTypes(selectedCard.types, card.types) > 0)
    .sort((left, right) => {
      const scoreDelta = scoreRelatedCard(selectedCard, right) - scoreRelatedCard(selectedCard, left);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return Math.abs(Number(selectedCard.number) - Number(left.number))
        - Math.abs(Number(selectedCard.number) - Number(right.number));
    })
    .slice(0, 3);

  if (evolutionCards.length === 0) {
    return fallbackCards;
  }

  const relatedCards = evolutionCards.slice();

  fallbackCards.forEach((card) => {
    if (relatedCards.length >= 3) {
      return;
    }

    if (!relatedCards.some((existingCard) => existingCard.number === card.number)) {
      relatedCards.push(card);
    }
  });

  return relatedCards;
}

function readCardIdFromEvent(event) {
  return event?.currentTarget?.getAttribute?.("data-card-id") ?? null;
}

function readCardNameFromEvent(event) {
  return event?.currentTarget?.getAttribute?.("data-card-name") ?? null;
}

function resolveCardDisplayName(card, locale, localizedNamesByLocale) {
  if (!card) {
    return "";
  }

  return (
    getLocalPokemonName(locale, card.number)
    ?? localizedNamesByLocale?.[locale]?.[card.number]
    ?? card.name
  );
}

function withDisplayName(card, locale, localizedNamesByLocale) {
  return {
    ...card,
    displayName: resolveCardDisplayName(card, locale, localizedNamesByLocale),
  };
}

export function App(props = {}) {
  // App은 문서에서 정의한 "단일 루트 상태 저장소" 역할을 그대로 수행한다.
  // 여기 있는 상태가 대시보드, 컬렉션, 상세, 설정 페이지 전체를 움직인다.
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
  const [lastAction, setLastAction] = useState(() => getLocaleMessages(initialSettings.locale).actions.loadingLibrary);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [detailById, setDetailById] = useState({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [catalogNotice, setCatalogNotice] = useState(null);
  const [isStreamingCatalog, setIsStreamingCatalog] = useState(false);
  const [localizedNamesByLocale, setLocalizedNamesByLocale] = useState({});
  const [collectionViewport, setCollectionViewport] = useState({
    scrollTop: 0,
    viewportHeight: COLLECTION_FALLBACK_VIEWPORT_HEIGHT,
    viewportWidth: COLLECTION_FALLBACK_VIEWPORT_WIDTH,
  });
  const [detailInteractivePresentation, setDetailInteractivePresentation] = useState(() => createInteractivePresentation());

  // [메모 1] 현재 언어에 맞는 문구 사전을 계산한다.
  // 원본 상태가 아니라 settings.locale에서 파생되는 읽기 전용 결과이므로 useState가 아니라 useMemo다.
  const copy = useMemo(() => getLocaleMessages(settings.locale), [settings.locale]);
  // [메모 2] 페이지 메타와 번역 문구로 네비게이션 아이템을 만든다.
  // 사용자가 직접 수정하는 상태가 아니라 copy.pages로부터 계산되는 구조물이므로 useMemo다.
  const pageItems = useMemo(() => createPageItems(PAGE_META, copy.pages), [copy.pages]);
  // [메모 3] 타입 라벨 맵을 현재 번역본에서 꺼낸다.
  // 별도 상태 저장소가 아니라 번역 사전의 일부를 읽어오는 파생값이므로 useMemo다.
  const typeLabels = useMemo(() => copy.typeLabels, [copy.typeLabels]);
  // [메모 4] 카드 원본에 현재 locale 표시 이름을 합쳐 "화면 표시용 카드 목록"을 만든다.
  // cards 자체를 복제 저장하는 상태가 아니라 locale 적용 결과를 재사용하려는 캐시라서 useMemo다.
  const localizedCards = useMemo(
    () => cards.map((card) => withDisplayName(card, settings.locale, localizedNamesByLocale)),
    [cards, localizedNamesByLocale, settings.locale]
  );
  // [메모 5] 검색어/타입/즐겨찾기/정렬 기준을 반영한 최종 카드 목록이다.
  // 사용자가 직접 setVisibleCards 하는 상태가 아니라 여러 상태를 조합한 계산 결과라서 useMemo다.
  const visibleCards = useMemo(() => sortCards(filterCards(localizedCards, {
    searchKeyword,
    typeFilter,
    favoritesOnly,
  }), sortMode, settings.locale), [favoritesOnly, localizedCards, searchKeyword, settings.locale, sortMode, typeFilter]);
  // [메모 6] 현재 즐겨찾기 카드 수를 센다.
  // cards에서 즉시 계산 가능한 숫자이며 단독 원본 상태가 아니므로 useMemo다.
  const favoriteCount = useMemo(() => cards.filter((card) => card.isFavorite).length, [cards]);
  // [메모 7] selectedCardId에 대응하는 기본 카드 객체를 찾는다.
  // 선택 카드 자체를 별도 상태로 중복 저장하지 않고, 목록과 id로부터 매핑하는 값이므로 useMemo다.
  const selectedCardBase = useMemo(
    () => localizedCards.find((card) => card.id === selectedCardId) ?? null,
    [localizedCards, selectedCardId]
  );
  // [메모 8] 선택 카드의 상세 정보 캐시에서 현재 카드 detail을 꺼낸다.
  // detailById와 selectedCardBase가 정해지면 결정되는 파생 참조값이므로 useMemo다.
  const selectedCardDetail = useMemo(
    () => (selectedCardBase ? detailById[selectedCardBase.id] ?? null : null),
    [detailById, selectedCardBase]
  );
  // [메모 9] 기본 카드 정보와 상세 정보를 합쳐 최종 상세 카드 객체를 만든다.
  // 카드 상세 표현용 합성 결과일 뿐, 독립적인 원본 상태가 아니므로 useMemo다.
  const selectedCard = useMemo(() => mergeCardWithDetail(selectedCardBase, selectedCardDetail), [selectedCardBase, selectedCardDetail]);
  // [메모 10] 상세 카드 1장의 틸트/광택 presentation을 실제 style 문자열로 변환한다.
  // style은 detailInteractivePresentation과 settings에서 계산되는 렌더용 값이지, 직접 수정할 상태가 아니므로 useMemo다.
  const detailInteractiveStyle = useMemo(
    // detailInteractiveStyle은 "디테일 카드 1장만" useState -> render -> patch 경로를 타도록 만든 시연용 경로다.
    // 즉, 같은 카드 hover라도 컬렉션은 직접 DOM, 상세 카드는 런타임 경로를 비교해서 볼 수 있다.
    () => createInteractiveStyleValue(detailInteractivePresentation, settings),
    [detailInteractivePresentation, settings]
  );
  // [메모 11] 현재 보이는 카드 목록을 타입별 요약 데이터로 집계한다.
  // visibleCards와 typeLabels로부터 계산되는 통계 결과이므로 useMemo다.
  const typeSummary = useMemo(() => buildTypeSummary(visibleCards, typeLabels), [typeLabels, visibleCards]);
  // [메모 12] 대표 카드 하나를 선택 카드 -> visibleCards 첫 카드 -> localizedCards 첫 카드 순으로 결정한다.
  // 조건식으로 매번 고를 수 있는 대표값이므로 별도 상태로 들고 있지 않고 useMemo로 계산한다.
  const spotlightCard = useMemo(
    () => selectedCard ?? visibleCards[0] ?? localizedCards[0] ?? null,
    [localizedCards, selectedCard, visibleCards]
  );
  // [메모 13] 타입 요약 중 최상위 메시지 후보를 고른다.
  // typeSummary를 읽어 만든 파생 요약값이라 useMemo다.
  const topTypeLeader = useMemo(() => resolveTopTypeMessage(typeSummary), [typeSummary]);
  // [메모 14] 대시보드 상단에 보여줄 최종 문장 문자열을 만든다.
  // 화면 문구는 copy.dashboard와 topTypeLeader가 정해지면 계산되는 결과이므로 useMemo다.
  const topTypeMessage = useMemo(() => (
    topTypeLeader
      ? copy.dashboard.topTypeMessage(topTypeLeader.label, topTypeLeader.count)
      : copy.dashboard.topTypeEmpty
  ), [copy.dashboard, topTypeLeader]);
  // [메모 15] 현재 선택 카드와 연관된 카드 목록을 계산한다.
  // 카드 목록/선택 카드/detail에 따라 달라지는 검색 결과이므로 useState가 아니라 useMemo다.
  const relatedCards = useMemo(() => {
    if (!selectedCardBase) {
      return [];
    }

    if (getDataMode() === "remote" && !selectedCardDetail) {
      return [];
    }

    return buildRelatedCards(selectedCardBase, selectedCardDetail, localizedCards);
  }, [localizedCards, selectedCardBase, selectedCardDetail]);
  // [메모 16] 컬렉션 영역 너비에 맞는 컬럼 수를 계산한다.
  // viewportWidth에 의해 결정되는 레이아웃 값이지 사용자 입력으로 직접 저장할 상태가 아니라서 useMemo다.
  const collectionColumnCount = useMemo(() => resolveCollectionColumnCount(collectionViewport.viewportWidth), [collectionViewport.viewportWidth]);
  // [메모 17] 현재 viewport 높이에 들어올 수 있는 행 수를 계산한다.
  // scroll 레이아웃 계산 결과이므로 useMemo다.
  const collectionVisibleRowCount = useMemo(
    () => Math.max(1, Math.ceil(collectionViewport.viewportHeight / COLLECTION_ROW_HEIGHT)),
    [collectionViewport.viewportHeight]
  );
  // [메모 18] 전체 카드 개수와 컬럼 수로 총 행 수를 계산한다.
  // 원본 상태가 아니라 visibleCards.length와 layout 규칙의 조합 결과라 useMemo다.
  const collectionTotalRowCount = useMemo(
    () => Math.ceil(visibleCards.length / collectionColumnCount),
    [collectionColumnCount, visibleCards.length]
  );
  // [메모 19] 현재 scrollTop 기준으로 윈도우 시작 행을 계산한다.
  // 가상 스크롤의 계산식 결과이므로 useMemo다.
  const collectionStartRow = useMemo(() => {
    const rawStartRow = Math.floor(collectionViewport.scrollTop / COLLECTION_ROW_HEIGHT) - COLLECTION_BUFFER_ROWS;
    const maxStartRow = Math.max(0, collectionTotalRowCount - (collectionVisibleRowCount + COLLECTION_BUFFER_ROWS * 2));

    return clamp(rawStartRow, 0, maxStartRow);
  }, [collectionTotalRowCount, collectionViewport.scrollTop, collectionVisibleRowCount]);
  // [메모 20] 현재 화면과 버퍼를 고려한 끝 행을 계산한다.
  // 시작 행과 총 행 수에서 유도되는 값이므로 useMemo다.
  const collectionEndRow = useMemo(
    () => Math.min(collectionTotalRowCount, collectionStartRow + collectionVisibleRowCount + COLLECTION_BUFFER_ROWS * 2),
    [collectionStartRow, collectionTotalRowCount, collectionVisibleRowCount]
  );
  // [메모 21] 시작 행을 실제 카드 배열 시작 인덱스로 바꾼다.
  // 행/열 계산의 중간 결과일 뿐 독립 상태가 아니라서 useMemo다.
  const collectionStartIndex = useMemo(() => collectionStartRow * collectionColumnCount, [collectionColumnCount, collectionStartRow]);
  // [메모 22] 끝 행을 실제 카드 배열 끝 인덱스로 바꾼다.
  // 렌더 범위 계산 결과이므로 useMemo다.
  const collectionEndIndex = useMemo(
    () => Math.min(visibleCards.length, collectionEndRow * collectionColumnCount),
    [collectionColumnCount, collectionEndRow, visibleCards.length]
  );
  // [메모 23] 실제로 렌더할 카드 부분 배열만 잘라낸다.
  // visibleCards 전체를 상태로 둘 필요 없이 현재 창 범위의 slice를 계산해 쓰면 되므로 useMemo다.
  const collectionVisibleSlice = useMemo(
    () => visibleCards.slice(collectionStartIndex, collectionEndIndex),
    [collectionEndIndex, collectionStartIndex, visibleCards]
  );
  // [메모 24] 가상 스크롤 window가 위에서 얼마나 떨어졌는지 오프셋을 계산한다.
  // 시작 행으로부터 결정되는 레이아웃 숫자이므로 useMemo다.
  const collectionWindowOffset = useMemo(
    () => collectionStartRow * COLLECTION_ROW_HEIGHT,
    [collectionStartRow]
  );
  // [메모 25] 스크롤 컨텐츠의 전체 높이를 계산한다.
  // viewport와 totalRowCount에서 결정되는 레이아웃 값이므로 useMemo다.
  const collectionContentHeight = useMemo(
    () => Math.max(collectionViewport.viewportHeight, collectionTotalRowCount * COLLECTION_ROW_HEIGHT),
    [collectionTotalRowCount, collectionViewport.viewportHeight]
  );
  // [메모 26] 컬렉션 관련 이벤트 핸들러 묶음 객체를 메모한다.
  // handlers는 사용자가 직접 바꾸는 상태가 아니라, 현재 copy/typeLabels를 캡처한 함수 집합이므로 useMemo다.
  const collectionHandlers = useMemo(() => ({
    onSearchInput(event) {
      const nextKeyword = event.target.value;

      setSearchKeyword(nextKeyword);
      setLastAction(copy.actions.searching(nextKeyword));
    },

    onTypeFilterChange(event) {
      const nextType = event.target.value;

      setTypeFilter(nextType);
      setLastAction(copy.actions.typeFilterChanged(
        nextType === "all"
          ? copy.toolbar.allTypes
          : typeLabels[nextType] ?? nextType
      ));
    },

    onFavoritesToggle(event) {
      const nextFavoritesOnly = Boolean(event.target.checked);

      setFavoritesOnly(nextFavoritesOnly);
      setLastAction(nextFavoritesOnly ? copy.actions.favoritesOnlyOn : copy.actions.favoritesOnlyOff);
    },

    onSortChange(event) {
      const nextSortMode = event.target.value;

      setSortMode(nextSortMode);
      setLastAction(copy.actions.sortChanged(copy.sortOptions[nextSortMode] ?? nextSortMode));
    },

    onViewportScroll(event) {
      const target = event.currentTarget;

      setCollectionViewport((previousValue) => {
        const nextValue = {
          scrollTop: target.scrollTop,
          viewportHeight: target.clientHeight || previousValue.viewportHeight,
          viewportWidth: target.clientWidth || previousValue.viewportWidth,
        };

        if (
          previousValue.scrollTop === nextValue.scrollTop
          && previousValue.viewportHeight === nextValue.viewportHeight
          && previousValue.viewportWidth === nextValue.viewportWidth
        ) {
          return previousValue;
        }

        return nextValue;
      });
    },

    onOpenCardClick(event) {
      const cardId = readCardIdFromEvent(event);

      if (!cardId) {
        return;
      }

      setSelectedCardId(cardId);
      setCurrentPage("detail");
      setLastAction(copy.actions.selectedCard(readCardNameFromEvent(event) ?? cardId));
    },

    onFavoriteCardClick(event) {
      const cardId = readCardIdFromEvent(event);

      if (!cardId) {
        return;
      }

      let nextAction = "Updated a saved card state.";

      // 여기서부터는 "진짜 앱 상태 변경" 경로다.
      // setCards가 useState setter를 호출하고, 그 안에서 scheduleUpdate가 루트 update를 예약한다.
      setCards((previousCards) =>
        previousCards.map((card) => {
          if (card.id !== cardId) {
            return card;
          }

          const nextFavorite = !card.isFavorite;
          nextAction = nextFavorite
            ? copy.actions.savedCard(card.displayName ?? card.name)
            : copy.actions.removedSavedCard(card.displayName ?? card.name);

          return {
            ...card,
            isFavorite: nextFavorite,
          };
        })
      );

      setLastAction(nextAction);
    },
  }), [copy, typeLabels]);
  // [메모 27] 컬렉션 카드 hover용 포인터 핸들러 묶음 객체를 메모한다.
  // 직접 DOM 경로에서 쓰는 핸들러 집합이며 settings에 따라 달라지는 함수 모음일 뿐 상태 저장소가 아니라서 useMemo다.
  const collectionPointerHandlers = useMemo(() => ({
    onPointerMove(event) {
      const element = event.currentTarget;
      const presentation = createInteractivePresentationFromPointerEvent(event);

      if (!presentation) {
        return;
      }

      applyInteractiveStyle(element, presentation, settings);
    },

    onPointerLeave(event) {
      const element = event.currentTarget;

      applyInteractiveStyle(element, createInteractivePresentation(), settings);
    },
  }), [settings.glareEnabled, settings.tiltEnabled]);

  useEffect(() => {
    // 페이지 전환이 실제로 반영되고 있음을 브라우저 탭 제목에서도 보여준다.
    // 발표 때 "상태 기반 다중 페이지"를 설명하기 좋은 작은 효과다.
    document.title = `${pageItems[currentPage]?.title ?? "Showcase"} · Prism Dex`;

    return () => {
      document.title = "Week5 React-like Runtime";
    };
  }, [currentPage, pageItems]);

  useEffect(() => {
    if (currentPage !== "collection") {
      return undefined;
    }

    const viewport = document.getElementById("collection-scroll-area");

    if (!viewport) {
      return undefined;
    }

    function syncViewport() {
      setCollectionViewport((previousValue) => {
        const nextValue = {
          scrollTop: viewport.scrollTop,
          viewportHeight: viewport.clientHeight || previousValue.viewportHeight,
          viewportWidth: viewport.clientWidth || previousValue.viewportWidth,
        };

        if (
          previousValue.scrollTop === nextValue.scrollTop
          && previousValue.viewportHeight === nextValue.viewportHeight
          && previousValue.viewportWidth === nextValue.viewportWidth
        ) {
          return previousValue;
        }

        return nextValue;
      });
    }

    syncViewport();

    let resizeObserver = null;

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(syncViewport);
      resizeObserver.observe(viewport);
    }

    window.addEventListener("resize", syncViewport);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      window.removeEventListener("resize", syncViewport);
    };
  }, [currentPage]);

  useEffect(() => {
    // 최초 데이터 로드와 "다시 불러오기"를 담당하는 effect다.
    // 캐시 -> 원격 새로고침 -> 실패 시 fallback 순서로 동작해
    // 시연 중 네트워크가 불안정해도 앱이 완전히 깨지지 않게 한다.
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
          setIsStreamingCatalog(false);
          setLastAction(copy.actions.cachedCatalogLoaded(cachedCards.length));
        }
      }

      try {
        if (dataMode === "remote" && cachedCatalog.length === 0) {
          const previewCards = mergeFavoriteFlags(await fetchPokemonPreviewCatalog(), favoriteIds);

          if (isActive && previewCards.length > 0) {
            setCards(previewCards);
            setSelectedCardId((previousValue) =>
              previewCards.some((card) => card.id === previousValue) ? previousValue : previewCards[0]?.id ?? null
            );
            setIsLoading(false);
            setIsStreamingCatalog(true);
            setCatalogNotice(copy.notices.previewCatalog);
            setLastAction(createCatalogStatusMessage(copy, previewCards.length, true));
          }
        }

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
        setIsStreamingCatalog(false);
        setCatalogNotice(null);
        setLastAction(createCatalogStatusMessage(copy, nextCards.length, false));

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
        setIsStreamingCatalog(false);
        setLoadError(null);
        setCatalogNotice(
          cachedCatalog.length > 0
            ? copy.notices.cachedCatalog
            : copy.notices.fallbackCatalog
        );
        setLastAction(`${copy.errors.loadingCardsTitle}. ${error.message}`);
      }
    }

    loadCatalog();

    return () => {
      isActive = false;
    };
  }, [catalogVersion]);

  useEffect(() => {
    // 즐겨찾기는 사용자의 개인 상태이므로 카드 배열이 바뀔 때마다 따로 저장한다.
    if (!canUseLocalStorage()) {
      return;
    }

    const favoriteIds = cards.filter((card) => card.isFavorite).map((card) => card.id);
    localStorage.setItem("card-showcase-favorites", JSON.stringify(favoriteIds));
  }, [cards]);

  useEffect(() => {
    // 설정도 앱 전역 상태이기 때문에 새로고침 후 복원할 수 있도록 저장한다.
    if (!canUseLocalStorage()) {
      return;
    }

    localStorage.setItem("card-showcase-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let isActive = true;

    if (getDataMode() !== "remote" || settings.locale === "en") {
      return () => {
        isActive = false;
      };
    }

    const targetNumbers = Array.from(new Set([
      ...(currentPage === "collection" ? collectionVisibleSlice.map((card) => card.number) : []),
      ...(currentPage === "detail" && selectedCardBase ? [selectedCardBase.number] : []),
      ...(currentPage === "dashboard" && spotlightCard ? [spotlightCard.number] : []),
    ])).filter(Boolean);
    const missingNumbers = targetNumbers.filter((number) => (
      !getLocalPokemonName(settings.locale, number)
      && !localizedNamesByLocale?.[settings.locale]?.[number]
    ));

    if (missingNumbers.length === 0) {
      return () => {
        isActive = false;
      };
    }

    async function loadLocalizedNames() {
      try {
        const nextNames = await fetchPokemonLocalizedNames(missingNumbers, settings.locale);

        if (!isActive || Object.keys(nextNames).length === 0) {
          return;
        }

        setLocalizedNamesByLocale((previousValue) => ({
          ...previousValue,
          [settings.locale]: {
            ...(previousValue[settings.locale] ?? {}),
            ...nextNames,
          },
        }));
      } catch {
        // Species name localization is optional UI enrichment. If this request fails,
        // the card browser can safely continue showing the English fallback names.
      }
    }

    loadLocalizedNames();

    return () => {
      isActive = false;
    };
  }, [
    collectionVisibleSlice,
    currentPage,
    localizedNamesByLocale,
    selectedCardBase,
    settings.locale,
    spotlightCard,
  ]);

  useEffect(() => {
    // 목록은 가볍게, 상세는 풍부하게 가져오기 위한 2단계 로딩 effect다.
    // selectedCardBase가 바뀔 때만 해당 카드의 상세 데이터를 추가로 요청한다.
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
        setDetailError(copy.errors.detailUnavailable(selectedCardBase.displayName ?? selectedCardBase.name));
        setDetailById((previousValue) => ({
          ...previousValue,
          [selectedCardBase.id]: createLocalDetail(selectedCardBase),
        }));
        setLastAction(`${copy.actions.detailFallback(selectedCardBase.displayName ?? selectedCardBase.name)} ${error.message}`);
      }
    }

    loadDetail();

    return () => {
      isActive = false;
    };
  }, [detailById, selectedCardBase]);

  function handleNavigate(page) {
    // 상세 페이지는 선택 카드가 없으면 의미가 없으므로,
    // 직접 들어오려 하면 컬렉션으로 돌려보낸다.
    if (page === "detail" && !selectedCardId) {
      setCurrentPage("collection");
      return;
    }

    setCurrentPage(page);
  }

  function handleSelectCard(cardId) {
    const target = cards.find((card) => card.id === cardId);

    if (!target) {
      return;
    }

    // 카드가 바뀌면 디테일 카드에 남아 있던 hover 표면 값도 함께 초기화한다.
    // 이 setState 역시 루트 업데이트 큐에 들어가므로 selectedCardId 변경과 같은 렌더 사이클로 묶일 수 있다.
    setDetailInteractivePresentation(createInteractivePresentation());
    setSelectedCardId(cardId);
    setLastAction(copy.actions.selectedCard(target.displayName ?? target.name));
  }

  function handleSelectAndOpen(cardId) {
    handleSelectCard(cardId);
    setCurrentPage("detail");
  }

  function handleToggleFavorite(cardId) {
    // 즐겨찾기 변경은 카드 데이터 자체에 기록되지만,
    // 실제로는 대시보드 KPI, 컬렉션 필터, 상세 버튼 상태까지 연쇄적으로 영향을 준다.
    // 따라서 이 setCards 한 번이 루트 App 전체를 다시 렌더시키는 시작점이 된다.
    let nextAction = "Updated a saved card state.";

    setCards((previousCards) =>
      previousCards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }

        const nextFavorite = !card.isFavorite;
        nextAction = nextFavorite
          ? copy.actions.savedCard(resolveCardDisplayName(card, settings.locale, localizedNamesByLocale))
          : copy.actions.removedSavedCard(resolveCardDisplayName(card, settings.locale, localizedNamesByLocale));

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
    setLastAction(copy.actions.defaultPageChanged(pageItems[nextPage]?.label ?? nextPage));
  }

  function handleDefaultSortChange(event) {
    const nextSortMode = event.target.value;

    setSettings((previousValue) => ({
      ...previousValue,
      defaultSortMode: nextSortMode,
    }));
    setSortMode(nextSortMode);
    setLastAction(copy.actions.defaultSortChanged(copy.sortOptions[nextSortMode] ?? nextSortMode));
  }

  function handleTiltToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      tiltEnabled: nextValue,
    }));
    setLastAction(nextValue ? copy.actions.tiltEnabled : copy.actions.tiltDisabled);
  }

  function handleGlareToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      glareEnabled: nextValue,
    }));
    setLastAction(nextValue ? copy.actions.glareEnabled : copy.actions.glareDisabled);
  }

  function handleHighResToggle(event) {
    const nextValue = Boolean(event.target.checked);

    setSettings((previousValue) => ({
      ...previousValue,
      highResImage: nextValue,
    }));
    setLastAction(nextValue ? copy.actions.highResEnabled : copy.actions.highResDisabled);
  }

  function handleLocaleChange(event) {
    const nextLocale = resolveSupportedLocale(event.target.value);
    const nextCopy = getLocaleMessages(nextLocale);

    setSettings((previousValue) => ({
      ...previousValue,
      locale: nextLocale,
    }));
    setLastAction(nextCopy.actions.languageChanged(
      LANGUAGE_OPTIONS.find((option) => option.value === nextLocale)?.label ?? nextLocale
    ));
  }

  function handleResetDemo() {
    // 설정, 필터, 선택 상태를 모두 초기화해 발표 중 언제든 기본 시연 상태로 돌아갈 수 있게 한다.
    const nextSettings = { ...DEFAULT_SETTINGS, locale: settings.locale };
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
    setLastAction(copy.actions.resetShowcase);
  }

  function handleRetryLoad() {
    // 다시 불러오기는 catalogVersion만 증가시켜
    // 카탈로그 로드 effect를 다시 실행시키는 단순한 방식으로 구현한다.
    setDetailById({});
    setCatalogVersion((previousValue) => previousValue + 1);
    setLastAction(copy.actions.reloadingDataset);
  }

  function handleSelectNext() {
    if (visibleCards.length === 0) {
      return;
    }

    const currentIndex = getCardIndex(visibleCards, selectedCardId);
    const nextIndex = currentIndex === -1 || currentIndex === visibleCards.length - 1 ? 0 : currentIndex + 1;
    handleSelectCard(visibleCards[nextIndex].id);
  }

  function handleDetailPointerMove(event) {
    // [업데이트 1] 상세 카드 hover는 의도적으로 useState 경로를 타게 만든다.
    // 즉 포인터 좌표 -> 임시 시각 상태 -> 루트 update 예약 -> render/diff/patch/commit 순서가 실제로 돈다.
    const nextPresentation = createInteractivePresentationFromPointerEvent(event);

    if (!nextPresentation) {
      return;
    }

    // [업데이트 2] 이 setter가 useState slot.value를 바꾸고 scheduleUpdate(component)를 부르게 된다.
    setDetailInteractivePresentation(nextPresentation);
  }

  function handleDetailPointerLeave() {
    // [업데이트 1-보조] pointer leave도 동일하게 하나의 상태 변경으로 취급한다.
    // 즉 "원래 시각 상태로 복귀"도 update -> patch -> commit 경로를 다시 탄다.
    setDetailInteractivePresentation(createInteractivePresentation());
  }

  function renderCurrentPage() {
    // 이 함수는 상태 기반 다중 페이지 SPA의 핵심이다.
    // 실제로는 앱을 다시 mount하지 않고, currentPage 값에 따라 다른 페이지 VNode만 선택한다.
    if (isLoading) {
      return h("section", { className: "page-stack", id: "page-loading" },
        h("article", { className: "panel-card empty-detail-card" },
          h("h1", null, copy.actions.loadingLibrary),
          h("p", { id: "loading-state" }, copy.collection.description)
        )
      );
    }

    if (loadError) {
      return h("section", { className: "page-stack", id: "page-error" },
        h("article", { className: "panel-card empty-detail-card" },
          h("h1", null, copy.errors.loadingCardsTitle),
          h("p", { id: "error-state" }, loadError),
          h("button", {
            id: "retry-load-button",
            className: "primary-button",
            onClick: handleRetryLoad,
          }, copy.common.retry)
        )
      );
    }

    if (currentPage === "collection") {
      return h(CollectionPage, {
        onNavigate: handleNavigate,
        cards: collectionVisibleSlice,
        visibleCount: visibleCards.length,
        renderedCount: collectionVisibleSlice.length,
        totalCount: cards.length,
        cardsPerRow: collectionColumnCount,
        rowHeight: COLLECTION_ROW_HEIGHT,
        contentHeight: collectionContentHeight,
        windowOffset: collectionWindowOffset,
        searchKeyword,
        typeFilter,
        favoritesOnly,
        sortMode,
        typeLabels,
        copy,
        settings,
        selectedCardId,
        emptyMessage: copy.collection.emptyMessage,
        onViewportScroll: collectionHandlers.onViewportScroll,
        onSearchInput: collectionHandlers.onSearchInput,
        onTypeFilterChange: collectionHandlers.onTypeFilterChange,
        onFavoritesToggle: collectionHandlers.onFavoritesToggle,
        onSortChange: collectionHandlers.onSortChange,
        onSelectCard: handleSelectAndOpen,
        onToggleFavorite: handleToggleFavorite,
        onOpenCardClick: collectionHandlers.onOpenCardClick,
        onFavoriteCardClick: collectionHandlers.onFavoriteCardClick,
        onPointerMove: collectionPointerHandlers.onPointerMove,
        onPointerLeave: collectionPointerHandlers.onPointerLeave,
      });
    }

    if (currentPage === "detail") {
      return h(DetailPage, {
        card: selectedCard,
        relatedCards,
        typeLabels,
        copy,
        settings,
        isDetailLoading,
        detailError,
        onNavigate: handleNavigate,
        onSelectCard: handleSelectAndOpen,
        onToggleFavorite: handleToggleFavorite,
        onSelectNext: handleSelectNext,
        onPointerMove: handleDetailPointerMove,
        onPointerLeave: handleDetailPointerLeave,
        interactiveStyle: detailInteractiveStyle,
      });
    }

    if (currentPage === "settings") {
      return h(SettingsPage, {
        pages: pageItems,
        copy,
        settings,
        onDefaultPageChange: handleDefaultPageChange,
        onDefaultSortChange: handleDefaultSortChange,
        onLocaleChange: handleLocaleChange,
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
      isStreamingCatalog,
      selectedCard,
      spotlightCard,
      lastAction,
      topTypeMessage,
      typeSummary,
      typeLabels,
      copy,
      settings,
      onNavigate: handleNavigate,
      onSelectCard: handleSelectAndOpen,
      onToggleFavorite: handleToggleFavorite,
      onPointerMove: collectionPointerHandlers.onPointerMove,
      onPointerLeave: collectionPointerHandlers.onPointerLeave,
    });
  }

  return h(AppShell, {
    currentPage,
    pages: pageItems,
    copy,
    onNavigate: handleNavigate,
    lastAction,
    catalogNotice,
    inspectorCard: selectedCard ?? spotlightCard,
    highResImage: settings.highResImage,
  }, renderCurrentPage());
}
