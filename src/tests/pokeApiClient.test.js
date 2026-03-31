/*
 * Responsibility:
 * - PokeAPI 클라이언트가 정규 전국도감 범위만 카탈로그에 포함하는지 검증한다.
 */

import { fetchPokemonCatalog } from "../app/data/pokeApiClient.js";

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
  ];
}
