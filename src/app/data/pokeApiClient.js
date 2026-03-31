/*
 * Responsibility:
 * - PokeAPI 공개 데이터를 카드 쇼케이스 앱에서 쓸 수 있는 단순 카드 레코드로 정규화한다.
 */

const API_ROOT = "https://pokeapi.co/api/v2";
const ARTWORK_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const THUMB_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const IGNORED_TYPES = new Set(["unknown", "shadow"]);
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
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to load the Pokemon catalog.");
  }
}

function createCardId(number) {
  return `card-${String(number).padStart(3, "0")}`;
}

function getPokemonIdFromUrl(url) {
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
  const response = await responsePromise;

  if (!response.ok) {
    throw new Error(`PokeAPI request failed with status ${response.status}.`);
  }

  return response.json();
}

async function fetchTypeMap(fetchImpl) {
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

export async function fetchPokemonCatalog(fetchImpl = globalThis.fetch) {
  assertFetch(fetchImpl);

  const [listData, typeMap] = await Promise.all([
    readJson(fetchImpl(`${API_ROOT}/pokemon?limit=100000&offset=0`)),
    fetchTypeMap(fetchImpl),
  ]);

  return listData.results
    .map((item) => {
      const pokemonId = getPokemonIdFromUrl(item.url);

      if (!pokemonId) {
        return null;
      }

      const number = String(pokemonId).padStart(3, "0");
      const types = sortTypes(typeMap.get(pokemonId) ?? ["normal"]);
      const sprites = getSpriteUrls(pokemonId);

      return {
        id: createCardId(number),
        name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
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

function extractFlavorText(speciesData) {
  const englishEntry = speciesData.flavor_text_entries.find((entry) => entry.language.name === "en");

  if (!englishEntry) {
    return "Species flavor text is unavailable for this card.";
  }

  return englishEntry.flavor_text.replace(/\s+/g, " ").trim();
}

export async function fetchPokemonDetail(card, fetchImpl = globalThis.fetch) {
  assertFetch(fetchImpl);

  const pokemonData = await readJson(fetchImpl(`${API_ROOT}/pokemon/${Number(card.number)}`));
  const speciesData = await readJson(fetchImpl(pokemonData.species.url));

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
  };
}
