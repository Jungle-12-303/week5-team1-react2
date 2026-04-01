/*
 * Responsibility:
 * - PokeAPI 클라이언트가 정규 전국도감 범위만 카탈로그에 포함하는지 검증한다.
 */

import {
  fetchPokemonCatalog,
  fetchPokemonDetail,
  fetchPokemonLocalizedNames,
  fetchPokemonPreviewCatalog,
} from "../app/data/pokeApiClient.js";

async function runCase(name, fn) {
  try {
    await fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

function createJsonResponse(body) {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  });
}

export async function runPokeApiClientTests() {
  return [
    await runCase("fetchPokemonCatalog keeps only the regular national dex range", async () => {
      const fetchCalls = [];
      const fetchMock = (url) => {
        fetchCalls.push(url);

        if (url.includes("/pokemon?limit=1025&offset=0")) {
          return createJsonResponse({
            results: [
              { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
              { name: "pecharunt", url: "https://pokeapi.co/api/v2/pokemon/1025/" },
              { name: "future-form", url: "https://pokeapi.co/api/v2/pokemon/1026/" },
            ],
          });
        }

        if (url.endsWith("/type")) {
          return createJsonResponse({
            results: [
              { name: "electric", url: "https://pokeapi.co/api/v2/type/13/" },
              { name: "ghost", url: "https://pokeapi.co/api/v2/type/8/" },
            ],
          });
        }

        if (url.endsWith("/type/13/")) {
          return createJsonResponse({
            name: "electric",
            pokemon: [
              { pokemon: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" } },
            ],
          });
        }

        if (url.endsWith("/type/8/")) {
          return createJsonResponse({
            name: "ghost",
            pokemon: [
              { pokemon: { name: "pecharunt", url: "https://pokeapi.co/api/v2/pokemon/1025/" } },
              { pokemon: { name: "future-form", url: "https://pokeapi.co/api/v2/pokemon/1026/" } },
            ],
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      };

      const cards = await fetchPokemonCatalog(fetchMock);
      const ids = cards.map((card) => card.number).join(",");

      if (ids !== "025,1025") {
        throw new Error(`Expected only the regular national dex range, received ${ids}.`);
      }

      if (!fetchCalls.some((url) => url.includes("/pokemon?limit=1025&offset=0"))) {
        throw new Error("Expected the catalog loader to request only the supported national dex range.");
      }
    }),
    await runCase("fetchPokemonPreviewCatalog loads only the first preview batch", async () => {
      const fetchCalls = [];
      const fetchMock = (url) => {
        fetchCalls.push(url);

        if (url.includes("/pokemon?limit=10&offset=0")) {
          return createJsonResponse({
            results: Array.from({ length: 12 }, (_, index) => ({
              name: `pokemon-${index + 1}`,
              url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
            })),
          });
        }

        const pokemonMatch = /\/pokemon\/(\d+)\/?$/.exec(url);

        if (pokemonMatch) {
          const pokemonId = Number(pokemonMatch[1]);

          return createJsonResponse({
            id: pokemonId,
            height: 7,
            weight: 69,
            types: [{ type: { name: "grass" } }],
            stats: [
              { stat: { name: "hp" }, base_stat: 45 },
              { stat: { name: "attack" }, base_stat: 49 },
              { stat: { name: "defense" }, base_stat: 49 },
              { stat: { name: "special-attack" }, base_stat: 65 },
              { stat: { name: "special-defense" }, base_stat: 65 },
              { stat: { name: "speed" }, base_stat: 45 },
            ],
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      };

      const cards = await fetchPokemonPreviewCatalog(fetchMock);

      if (cards.length !== 10) {
        throw new Error(`Expected preview catalog to load 10 cards, received ${cards.length}.`);
      }

      if (!fetchCalls.some((url) => url.includes("/pokemon?limit=10&offset=0"))) {
        throw new Error("Expected the preview catalog to request only the initial batch.");
      }
    }),
    await runCase("catalog and preview loaders normalize duplicate types into a stable unique order", async () => {
      const fetchMock = (url) => {
        if (url.includes("/pokemon?limit=1025&offset=0")) {
          return createJsonResponse({
            results: [
              { name: "girafarig", url: "https://pokeapi.co/api/v2/pokemon/203/" },
            ],
          });
        }

        if (url.endsWith("/type")) {
          return createJsonResponse({
            results: [
              { name: "normal", url: "https://pokeapi.co/api/v2/type/1/" },
              { name: "psychic", url: "https://pokeapi.co/api/v2/type/14/" },
            ],
          });
        }

        if (url.endsWith("/type/1/")) {
          return createJsonResponse({
            name: "normal",
            pokemon: [
              { pokemon: { name: "girafarig", url: "https://pokeapi.co/api/v2/pokemon/203/" } },
            ],
          });
        }

        if (url.endsWith("/type/14/")) {
          return createJsonResponse({
            name: "psychic",
            pokemon: [
              { pokemon: { name: "girafarig", url: "https://pokeapi.co/api/v2/pokemon/203/" } },
            ],
          });
        }

        if (url.includes("/pokemon?limit=10&offset=0") || url.includes("/pokemon?limit=1&offset=0")) {
          return createJsonResponse({
            results: [
              { name: "raging-bolt", url: "https://pokeapi.co/api/v2/pokemon/1021/" },
            ],
          });
        }

        if (url.endsWith("/pokemon/1021/")) {
          return createJsonResponse({
            id: 1021,
            height: 52,
            weight: 4800,
            types: [
              { type: { name: "electric" } },
              { type: { name: "dragon" } },
              { type: { name: "electric" } },
            ],
            stats: [
              { stat: { name: "hp" }, base_stat: 125 },
              { stat: { name: "attack" }, base_stat: 73 },
              { stat: { name: "defense" }, base_stat: 91 },
              { stat: { name: "special-attack" }, base_stat: 137 },
              { stat: { name: "special-defense" }, base_stat: 89 },
              { stat: { name: "speed" }, base_stat: 75 },
            ],
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      };

      const catalog = await fetchPokemonCatalog(fetchMock);
      const preview = await fetchPokemonPreviewCatalog(fetchMock, 1);

      if ((catalog[0]?.types ?? []).join(",") !== "normal,psychic") {
        throw new Error(`Expected catalog types to remain unique and ordered, received ${(catalog[0]?.types ?? []).join(",")}.`);
      }

      if ((preview[0]?.types ?? []).join(",") !== "electric,dragon") {
        throw new Error(`Expected preview types to dedupe repeated values, received ${(preview[0]?.types ?? []).join(",")}.`);
      }
    }),
    await runCase("fetchPokemonLocalizedNames resolves supported locale names with fallback priority", async () => {
      const fetchMock = (url) => {
        if (url.endsWith("/pokemon-species/25")) {
          return createJsonResponse({
            name: "pikachu",
            names: [
              { language: { name: "en" }, name: "Pikachu" },
              { language: { name: "ko" }, name: "피카츄" },
              { language: { name: "ja-Hrkt" }, name: "ピカチュウ" },
              { language: { name: "zh-Hant" }, name: "皮卡丘" },
              { language: { name: "es" }, name: "Pikachu" },
            ],
          });
        }

        if (url.endsWith("/pokemon-species/6")) {
          return createJsonResponse({
            name: "charizard",
            names: [
              { language: { name: "en" }, name: "Charizard" },
            ],
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      };

      const localizedNames = await fetchPokemonLocalizedNames(["025", "006"], "ko", fetchMock);

      if (localizedNames["025"] !== "피카츄") {
        throw new Error(`Expected Korean species name for #025, received ${localizedNames["025"]}.`);
      }

      if (localizedNames["006"] !== "Charizard") {
        throw new Error(`Expected English fallback for #006, received ${localizedNames["006"]}.`);
      }
    }),
    await runCase("fetchPokemonDetail extracts evolution chain dex numbers for related cards", async () => {
      const fetchMock = (url) => {
        if (url.endsWith("/pokemon/1")) {
          return createJsonResponse({
            height: 7,
            weight: 69,
            types: [{ type: { name: "grass" } }, { type: { name: "poison" } }],
            stats: [
              { stat: { name: "hp" }, base_stat: 45 },
              { stat: { name: "attack" }, base_stat: 49 },
              { stat: { name: "defense" }, base_stat: 49 },
              { stat: { name: "special-attack" }, base_stat: 65 },
              { stat: { name: "special-defense" }, base_stat: 65 },
              { stat: { name: "speed" }, base_stat: 45 },
            ],
            species: { url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
          });
        }

        if (url.endsWith("/pokemon-species/1/")) {
          return createJsonResponse({
            flavor_text_entries: [
              { language: { name: "en" }, flavor_text: "A strange seed was planted on its back at birth." },
            ],
            evolution_chain: { url: "https://pokeapi.co/api/v2/evolution-chain/1/" },
          });
        }

        if (url.endsWith("/evolution-chain/1/")) {
          return createJsonResponse({
            chain: {
              species: { url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
              evolves_to: [
                {
                  species: { url: "https://pokeapi.co/api/v2/pokemon-species/2/" },
                  evolves_to: [
                    {
                      species: { url: "https://pokeapi.co/api/v2/pokemon-species/3/" },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      };

      const detail = await fetchPokemonDetail({ number: "001" }, fetchMock);
      const evolutionLine = detail.evolutionDexNumbers.join(",");

      if (evolutionLine !== "001,002,003") {
        throw new Error(`Expected evolution line 001,002,003 but received ${evolutionLine}.`);
      }
    }),
  ];
}
