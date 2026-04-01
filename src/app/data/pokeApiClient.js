/*
 * Responsibility:
 * - PokeAPI 공개 데이터를 카드 쇼케이스 앱에서 쓸 수 있는 단순 카드 레코드로 정규화한다.
 */

const API_ROOT = "https://pokeapi.co/api/v2";
const ARTWORK_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const THUMB_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const MAX_NATIONAL_DEX = 1025;
const PREVIEW_CARD_COUNT = 10;
const IGNORED_TYPES = new Set(["unknown", "shadow"]);
const LOCALE_NAME_PRIORITY = {
  en: ["en"],
  ko: ["ko"],
  ja: ["ja-Hrkt", "ja"],
  zh: ["zh-Hant", "zh-Hans", "zh"],
  es: ["es"],
};
const TYPE_ORDER = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

function assertFetch(fetchImpl) {
  // 네트워크 함수 주입을 허용하면 테스트에서 fetch를 쉽게 가짜로 바꿀 수 있다.
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to load the Pokemon catalog.");
  }
}

function createCardId(number) {
  return `card-${String(number).padStart(3, "0")}`;
}

function getPokemonIdFromUrl(url) {
  // PokeAPI 목록 응답은 id를 직접 주지 않고 URL을 주므로,
  // 정규식으로 마지막 숫자를 뽑아 카드 번호로 사용한다.
  const match = /\/pokemon\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

function getSpriteUrls(id) {
  return {
    imageUrl: `${ARTWORK_ROOT}/${id}.png`,
    thumbUrl: `${THUMB_ROOT}/${id}.png`,
  };
}

function getShowcaseRarity(id, types) {
  // 실제 카드 rarity API가 있는 것이 아니라,
  // 시연용 쇼케이스 분위기를 위해 규칙 기반 rarity를 만든다.
  if (types.length >= 2 && id % 25 === 0) {
    return "Prismatic Rare";
  }

  if (types.length >= 2) {
    return "Holo Rare";
  }

  if (id % 10 === 0) {
    return "Collector Rare";
  }

  return "Rare";
}

function sortTypes(types) {
  return types.slice().sort((left, right) => TYPE_ORDER.indexOf(left) - TYPE_ORDER.indexOf(right));
}

async function readJson(responsePromise) {
  // fetch와 json 파싱을 한곳에 모아두면 오류 처리를 재사용하기 쉽다.
  const response = await responsePromise;

  if (!response.ok) {
    throw new Error(`PokeAPI request failed with status ${response.status}.`);
  }

  return response.json();
}

async function fetchTypeMap(fetchImpl) {
  // PokeAPI의 pokemon 목록에는 타입이 직접 포함되지 않으므로,
  // type 엔드포인트들을 읽어서 "포켓몬 id -> 타입 배열" 맵으로 미리 정리한다.
  const typeList = await readJson(fetchImpl(`${API_ROOT}/type`));
  const usableTypes = typeList.results.filter((item) => !IGNORED_TYPES.has(item.name));
  const detailResponses = await Promise.all(usableTypes.map((item) => readJson(fetchImpl(item.url))));
  const typeMap = new Map();

  detailResponses.forEach((typeDetail) => {
    const typeName = typeDetail.name;

    typeDetail.pokemon.forEach((entry) => {
      const pokemonId = getPokemonIdFromUrl(entry.pokemon.url);

      if (!pokemonId) {
        return;
      }

      const existingTypes = typeMap.get(pokemonId) ?? [];

      if (!existingTypes.includes(typeName)) {
        existingTypes.push(typeName);
      }

      typeMap.set(pokemonId, existingTypes);
    });
  });

  return typeMap;
}

function normalizeName(name) {
  // PokeAPI 이름은 소문자/하이픈 기반이므로, 카드 제목처럼 읽히도록 다듬는다.
  return name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function extractLocalizedSpeciesName(speciesData, locale, fallbackName) {
  const priority = LOCALE_NAME_PRIORITY[locale] ?? LOCALE_NAME_PRIORITY.en;
  const names = Array.isArray(speciesData?.names) ? speciesData.names : [];

  for (const languageName of priority) {
    const match = names.find((entry) => entry.language?.name === languageName);

    if (match?.name) {
      return match.name;
    }
  }

  const englishMatch = names.find((entry) => entry.language?.name === "en");
  return englishMatch?.name ?? fallbackName;
}

export async function fetchPokemonCatalog(fetchImpl = globalThis.fetch) {
  assertFetch(fetchImpl);

  // 초기 카탈로그는 "목록을 그리는 데 필요한 최소 정보"만 가져온다.
  // 상세 스탯/플레이버는 Detail 페이지에서 추가 요청한다.
  const [listData, typeMap] = await Promise.all([
    readJson(fetchImpl(`${API_ROOT}/pokemon?limit=${MAX_NATIONAL_DEX}&offset=0`)),
    fetchTypeMap(fetchImpl),
  ]);

  return listData.results
    .map((item) => {
      const pokemonId = getPokemonIdFromUrl(item.url);

      if (!pokemonId || pokemonId > MAX_NATIONAL_DEX) {
        return null;
      }

      const number = String(pokemonId).padStart(3, "0");
      const types = sortTypes(typeMap.get(pokemonId) ?? ["normal"]);
      const sprites = getSpriteUrls(pokemonId);

      return {
        id: createCardId(number),
        name: normalizeName(item.name),
        number,
        imageUrl: sprites.imageUrl,
        thumbUrl: sprites.thumbUrl,
        types,
        rarity: getShowcaseRarity(pokemonId, types),
        height: null,
        weight: null,
        baseStats: null,
        flavor: "Open the detail page to load this Pokemon's full species stats and flavor text.",
        isFavorite: false,
      };
    })
    .filter(Boolean);
}

export async function fetchPokemonPreviewCatalog(fetchImpl = globalThis.fetch, limit = PREVIEW_CARD_COUNT) {
  assertFetch(fetchImpl);

  const safeLimit = Math.max(1, Math.min(limit, PREVIEW_CARD_COUNT, MAX_NATIONAL_DEX));
  const listData = await readJson(fetchImpl(`${API_ROOT}/pokemon?limit=${safeLimit}&offset=0`));
  const detailRows = await Promise.all(
    listData.results.slice(0, safeLimit).map(async (item) => {
      const pokemonId = getPokemonIdFromUrl(item.url);

      if (!pokemonId || pokemonId > MAX_NATIONAL_DEX) {
        return null;
      }

      const pokemonData = await readJson(fetchImpl(item.url));
      const number = String(pokemonId).padStart(3, "0");
      const types = sortTypes(pokemonData.types.map((entry) => entry.type.name));
      const sprites = getSpriteUrls(pokemonId);

      return {
        id: createCardId(number),
        name: normalizeName(item.name),
        number,
        imageUrl: sprites.imageUrl,
        thumbUrl: sprites.thumbUrl,
        types,
        rarity: getShowcaseRarity(pokemonId, types),
        height: pokemonData.height / 10,
        weight: pokemonData.weight / 10,
        baseStats: {
          hp: pokemonData.stats.find((entry) => entry.stat.name === "hp")?.base_stat ?? 0,
          attack: pokemonData.stats.find((entry) => entry.stat.name === "attack")?.base_stat ?? 0,
          defense: pokemonData.stats.find((entry) => entry.stat.name === "defense")?.base_stat ?? 0,
          specialAttack: pokemonData.stats.find((entry) => entry.stat.name === "special-attack")?.base_stat ?? 0,
          specialDefense: pokemonData.stats.find((entry) => entry.stat.name === "special-defense")?.base_stat ?? 0,
          speed: pokemonData.stats.find((entry) => entry.stat.name === "speed")?.base_stat ?? 0,
        },
        flavor: "Preview cards load first so the collection can open immediately while the full national catalog streams in.",
        isFavorite: false,
      };
    })
  );

  return detailRows.filter(Boolean);
}

function extractFlavorText(speciesData) {
  const englishEntry = speciesData.flavor_text_entries.find((entry) => entry.language.name === "en");

  if (!englishEntry) {
    return "Species flavor text is unavailable for this card.";
  }

  return englishEntry.flavor_text.replace(/\s+/g, " ").trim();
}

function flattenEvolutionChain(node, collector = []) {
  if (!node || !node.species?.url) {
    return collector;
  }

  const speciesIdMatch = /\/pokemon-species\/(\d+)\/?$/.exec(node.species.url);

  if (speciesIdMatch) {
    collector.push(String(Number(speciesIdMatch[1])).padStart(3, "0"));
  }

  const evolvesTo = Array.isArray(node.evolves_to) ? node.evolves_to : [];
  evolvesTo.forEach((child) => flattenEvolutionChain(child, collector));
  return collector;
}

export async function fetchPokemonDetail(card, fetchImpl = globalThis.fetch) {
  assertFetch(fetchImpl);

  // Detail 페이지는 선택 카드 한 장만 더 풍부하게 보여주면 되므로,
  // pokemon + species 두 응답을 합쳐 필요한 필드만 뽑는다.
  const pokemonData = await readJson(fetchImpl(`${API_ROOT}/pokemon/${Number(card.number)}`));
  const speciesData = await readJson(fetchImpl(pokemonData.species.url));
  const evolutionChainData = speciesData.evolution_chain?.url
    ? await readJson(fetchImpl(speciesData.evolution_chain.url))
    : null;

  return {
    types: sortTypes(pokemonData.types.map((entry) => entry.type.name)),
    height: pokemonData.height / 10,
    weight: pokemonData.weight / 10,
    baseStats: {
      hp: pokemonData.stats.find((entry) => entry.stat.name === "hp")?.base_stat ?? 0,
      attack: pokemonData.stats.find((entry) => entry.stat.name === "attack")?.base_stat ?? 0,
      defense: pokemonData.stats.find((entry) => entry.stat.name === "defense")?.base_stat ?? 0,
      specialAttack: pokemonData.stats.find((entry) => entry.stat.name === "special-attack")?.base_stat ?? 0,
      specialDefense: pokemonData.stats.find((entry) => entry.stat.name === "special-defense")?.base_stat ?? 0,
      speed: pokemonData.stats.find((entry) => entry.stat.name === "speed")?.base_stat ?? 0,
    },
    flavor: extractFlavorText(speciesData),
    evolutionDexNumbers: evolutionChainData ? flattenEvolutionChain(evolutionChainData.chain) : [],
  };
}

export async function fetchPokemonLocalizedNames(numbers, locale, fetchImpl = globalThis.fetch) {
  assertFetch(fetchImpl);

  if (!Array.isArray(numbers) || numbers.length === 0) {
    return {};
  }

  const normalizedLocale = locale in LOCALE_NAME_PRIORITY ? locale : "en";
  const uniqueNumbers = Array.from(new Set(
    numbers
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value <= MAX_NATIONAL_DEX)
  ));

  if (uniqueNumbers.length === 0) {
    return {};
  }

  const pairs = await Promise.all(uniqueNumbers.map(async (pokemonNumber) => {
    const speciesData = await readJson(fetchImpl(`${API_ROOT}/pokemon-species/${pokemonNumber}`));
    const fallbackName = normalizeName(speciesData.name ?? String(pokemonNumber));

    return [
      String(pokemonNumber).padStart(3, "0"),
      extractLocalizedSpeciesName(speciesData, normalizedLocale, fallbackName),
    ];
  }));

  return Object.fromEntries(pairs);
}
