/*
 * Responsibility:
 * - PokeAPI 클라이언트가 정규 전국도감 범위만 카탈로그에 포함하는지 검증한다.
 */

import { fetchPokemonCatalog, fetchPokemonPreviewCatalog } from "../app/data/pokeApiClient.js";

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
  ];
}
