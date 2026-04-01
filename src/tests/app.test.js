/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 앱의 핵심 사용자 흐름을 검증한다.
 */

import { createApp, h } from "../index.js";
import { App } from "../app/App.js";
import { CollectionPage } from "../app/pages/CollectionPage.js";
import { getLocaleMessages } from "../app/i18n/messages.js";

function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve());
}

async function runCase(name, fn) {
  try {
    await fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

function click(element) {
  element.dispatchEvent(new Event("click", { bubbles: true }));
}

function inputValue(element, value) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function changeValue(element, value) {
  element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function createJsonResponse(body) {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  });
}

function createMockCards(count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");

    return {
      id: `card-${number}`,
      name: `Pokemon ${index + 1}`,
      number,
      imageUrl: `https://example.com/${number}.png`,
      thumbUrl: `https://example.com/${number}-thumb.png`,
      types: ["grass"],
      rarity: "Rare",
      height: 0.7,
      weight: 6.9,
      baseStats: {
        hp: 45,
        attack: 49,
        defense: 49,
        specialAttack: 65,
        specialDefense: 65,
        speed: 45,
      },
      flavor: "Virtualized test card.",
      isFavorite: false,
    };
  });
}

function bindRuntimeInspector(root, runtimeBridge) {
  runtimeBridge.subscribe((snapshot) => {
    const renderCount = root.querySelector("#inspector-render-count .inspector-stat-value");
    const lastPatchCount = root.querySelector("#inspector-last-patch-count .inspector-stat-value");
    const totalPatchCount = root.querySelector("#inspector-total-patch-count .inspector-stat-value");
    const meta = root.querySelector("#inspector-runtime-meta");
    const list = root.querySelector("#runtime-inspector-patches");

    if (renderCount) {
      renderCount.textContent = String(snapshot.renderCount);
    }

    if (lastPatchCount) {
      lastPatchCount.textContent = String(snapshot.lastRenderPatchCount ?? snapshot.patchCount ?? 0);
    }

    if (totalPatchCount) {
      totalPatchCount.textContent = String(snapshot.totalPatchCount ?? 0);
    }

    if (meta) {
      meta.textContent = `Reason: ${snapshot.reason} · Diff: ${snapshot.diffMode}`;
    }

    if (!list) {
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    if (!snapshot.patchLabels || snapshot.patchLabels.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "inspector-patch-row is-empty";
      emptyItem.textContent = "No DOM patch was needed for the last render.";
      list.appendChild(emptyItem);
      return;
    }

    for (const label of snapshot.patchLabels.slice(0, 6)) {
      const item = document.createElement("li");
      item.className = "inspector-patch-row";
      item.textContent = label;
      list.appendChild(item);
    }
  });
}

function createMountedApp(options = {}) {
  globalThis.__CARD_SHOWCASE_DATA_MODE__ = options.dataMode ?? "local";
  globalThis.__CARD_SHOWCASE_LOCALE__ = options.locale ?? "en";
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  const root = document.createElement("div");
  const runtimeBridge = options.props?.runtimeBridge;

  if (runtimeBridge) {
    bindRuntimeInspector(root, runtimeBridge);
  }

  const app = createApp({
    root,
    component: App,
    batching: "microtask",
    props: options.props ?? {},
  });
  app.mount();
  return { root, app };
}

export async function runAppTests() {
  return Promise.all([
    runCase("card showcase renders dashboard after the initial load", async () => {
      const { root } = createMountedApp();
      await flushMicrotasks();

      if (!root.querySelector("#page-dashboard")) {
        throw new Error("Expected the dashboard page to render after the initial load.");
      }

      if (!root.querySelector("#summary-total-cards").textContent.includes("6")) {
        throw new Error("Expected dashboard KPI to show the seeded card count.");
      }
    }),
    runCase("card showcase filters and selects cards from the collection page", async () => {
      const { root } = createMountedApp();
      await flushMicrotasks();

      click(root.querySelector("#nav-collection"));
      await flushMicrotasks();

      inputValue(root.querySelector("#collection-search-input"), "char");
      await flushMicrotasks();

      const collectionPage = root.querySelector("#page-collection");

      if (!collectionPage.textContent.includes("Charizard")) {
        throw new Error("Expected collection search to show the matching card.");
      }

      if (collectionPage.textContent.includes("Pikachu")) {
        throw new Error("Expected collection search to narrow the visible grid.");
      }

      click(root.querySelector("#card-open-card-006"));
      await flushMicrotasks();

      if (!root.querySelector("#page-detail")) {
        throw new Error("Expected selecting a card to open the detail page.");
      }

      if (!root.querySelector("#detail-card-name").textContent.includes("Charizard")) {
        throw new Error("Expected detail page to render the selected card.");
      }

      const statText = root.querySelector("#detail-base-stats").textContent;

      if (!statText.includes("Attack") || !statText.includes("Speed")) {
        throw new Error("Expected detail page to render the full base stat list instead of HP alone.");
      }
    }),
    runCase("detail related card buttons navigate after the evolution chain loads", async () => {
      const originalFetch = globalThis.fetch;
      const typeRows = {
        grass: ["43", "44", "45", "69", "70", "71"],
        poison: ["43", "44", "45", "69", "70", "71"],
      };
      const pokemonRows = {
        43: { name: "oddish", number: "043", types: ["grass", "poison"], height: 5, weight: 54, stats: [45, 50, 55, 75, 65, 30] },
        44: { name: "gloom", number: "044", types: ["grass", "poison"], height: 8, weight: 86, stats: [60, 65, 70, 85, 75, 40] },
        45: { name: "vileplume", number: "045", types: ["grass", "poison"], height: 12, weight: 186, stats: [75, 80, 85, 110, 90, 50] },
        69: { name: "bellsprout", number: "069", types: ["grass", "poison"], height: 7, weight: 40, stats: [50, 75, 35, 70, 30, 40] },
        70: { name: "weepinbell", number: "070", types: ["grass", "poison"], height: 10, weight: 64, stats: [65, 90, 50, 85, 45, 55] },
        71: { name: "victreebel", number: "071", types: ["grass", "poison"], height: 17, weight: 155, stats: [80, 105, 65, 100, 70, 70] },
      };

      function createPokemonResponse(id) {
        const row = pokemonRows[id];
        return {
          id,
          height: row.height,
          weight: row.weight,
          types: row.types.map((type) => ({ type: { name: type } })),
          stats: [
            { stat: { name: "hp" }, base_stat: row.stats[0] },
            { stat: { name: "attack" }, base_stat: row.stats[1] },
            { stat: { name: "defense" }, base_stat: row.stats[2] },
            { stat: { name: "special-attack" }, base_stat: row.stats[3] },
            { stat: { name: "special-defense" }, base_stat: row.stats[4] },
            { stat: { name: "speed" }, base_stat: row.stats[5] },
          ],
          species: { url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
        };
      }

      globalThis.fetch = (url) => {
        if (url.includes("/pokemon?limit=10&offset=0")) {
          return createJsonResponse({
            results: [43, 44, 45, 69, 70, 71].map((id) => ({
              name: pokemonRows[id].name,
              url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
            })),
          });
        }

        if (url.includes("/pokemon?limit=1025&offset=0")) {
          return createJsonResponse({
            results: [43, 44, 45, 69, 70, 71].map((id) => ({
              name: pokemonRows[id].name,
              url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
            })),
          });
        }

        if (url.endsWith("/type")) {
          return createJsonResponse({
            results: [
              { name: "grass", url: "https://pokeapi.co/api/v2/type/12/" },
              { name: "poison", url: "https://pokeapi.co/api/v2/type/4/" },
            ],
          });
        }

        if (url.endsWith("/type/12/")) {
          return createJsonResponse({
            name: "grass",
            pokemon: typeRows.grass.map((id) => ({
              pokemon: { name: pokemonRows[id].name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
            })),
          });
        }

        if (url.endsWith("/type/4/")) {
          return createJsonResponse({
            name: "poison",
            pokemon: typeRows.poison.map((id) => ({
              pokemon: { name: pokemonRows[id].name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
            })),
          });
        }

        const pokemonMatch = /\/pokemon\/(\d+)\/?$/.exec(url);

        if (pokemonMatch) {
          const id = Number(pokemonMatch[1]);
          return createJsonResponse(createPokemonResponse(id));
        }

        const speciesMatch = /\/pokemon-species\/(\d+)\/?$/.exec(url);

        if (speciesMatch) {
          const id = Number(speciesMatch[1]);
          return createJsonResponse({
            name: pokemonRows[id].name,
            names: [{ language: { name: "en" }, name: pokemonRows[id].name.replace(/^./, (value) => value.toUpperCase()) }],
            flavor_text_entries: [
              { language: { name: "en" }, flavor_text: `${pokemonRows[id].name} flavor text.` },
            ],
            evolution_chain: { url: id <= 45 ? "https://pokeapi.co/api/v2/evolution-chain/18/" : "https://pokeapi.co/api/v2/evolution-chain/32/" },
          });
        }

        if (url.endsWith("/evolution-chain/18/")) {
          return createJsonResponse({
            chain: {
              species: { url: "https://pokeapi.co/api/v2/pokemon-species/43/" },
              evolves_to: [
                {
                  species: { url: "https://pokeapi.co/api/v2/pokemon-species/44/" },
                  evolves_to: [
                    {
                      species: { url: "https://pokeapi.co/api/v2/pokemon-species/45/" },
                      evolves_to: [],
                    },
                  ],
                },
              ],
            },
          });
        }

        if (url.endsWith("/evolution-chain/32/")) {
          return createJsonResponse({
            chain: {
              species: { url: "https://pokeapi.co/api/v2/pokemon-species/69/" },
              evolves_to: [
                {
                  species: { url: "https://pokeapi.co/api/v2/pokemon-species/70/" },
                  evolves_to: [
                    {
                      species: { url: "https://pokeapi.co/api/v2/pokemon-species/71/" },
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

      try {
        const { root } = createMountedApp({ dataMode: "remote", locale: "en" });
        await flushMicrotasks();
        await flushMicrotasks();
        await flushMicrotasks();

        click(root.querySelector("#nav-collection"));
        await flushMicrotasks();

        inputValue(root.querySelector("#collection-search-input"), "vile");
        await flushMicrotasks();
        await flushMicrotasks();

        const vileplumeButton = root.querySelector("#card-open-card-045")
          ?? root.querySelector("#collection-card-grid .card-visual-button");

        if (!vileplumeButton) {
          throw new Error("Expected the filtered collection view to expose a detail-open button.");
        }

        click(vileplumeButton);
        await flushMicrotasks();
        await flushMicrotasks();
        await flushMicrotasks();

        const relatedButtons = [
          root.querySelector("#detail-related-card-043"),
          root.querySelector("#detail-related-card-044"),
          root.querySelector("#detail-related-card-069"),
          root.querySelector("#detail-related-card-070"),
          root.querySelector("#detail-related-card-071"),
        ].filter(Boolean);
        const relatedNames = relatedButtons.map((button) => button.textContent ?? "");

        if (relatedButtons.length === 0) {
          throw new Error("Expected the detail page to render a related card button after loading evolution data.");
        }

        if (!relatedNames.includes("Oddish") || !relatedNames.includes("Gloom")) {
          throw new Error(`Expected Vileplume to recommend its evolution line first, received ${relatedNames.join(", ")}.`);
        }

        if (relatedButtons.length < 3) {
          throw new Error(`Expected the detail page to top up evolution matches with a similar card, received ${relatedNames.join(", ")}.`);
        }

        click(relatedButtons[0]);
        await flushMicrotasks();
        await flushMicrotasks();

        const currentTitle = root.querySelector("#detail-card-name")?.textContent ?? "";

        if (!currentTitle || currentTitle.includes("Vileplume")) {
          throw new Error(`Expected a related card click to navigate away from Vileplume, received ${currentTitle}.`);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    }),
    runCase("card showcase favorites update dashboard metrics immediately", async () => {
      const { root } = createMountedApp();
      await flushMicrotasks();

      click(root.querySelector("#nav-collection"));
      await flushMicrotasks();

      click(root.querySelector("#card-favorite-card-025"));
      await flushMicrotasks();

      if (!root.querySelector("#global-status-message").textContent.includes("Pikachu")) {
        throw new Error("Expected saving a card to update the shared status banner.");
      }

      click(root.querySelector("#nav-dashboard"));
      await flushMicrotasks();

      if (!root.querySelector("#summary-favorite-cards").textContent.includes("1")) {
        throw new Error("Expected dashboard favorite KPI to reflect the saved card count.");
      }
    }),
    runCase("card showcase settings apply immediately across pages", async () => {
      const { root } = createMountedApp();
      await flushMicrotasks();

      click(root.querySelector("#nav-settings"));
      await flushMicrotasks();

      changeValue(root.querySelector("#settings-default-sort"), "name");
      await flushMicrotasks();

      const tiltToggle = root.querySelector("#settings-tilt-toggle");
      tiltToggle.checked = false;
      tiltToggle.dispatchEvent(new Event("change", { bubbles: true }));
      await flushMicrotasks();

      click(root.querySelector("#nav-collection"));
      await flushMicrotasks();

      if (root.querySelector("#collection-sort-select").value !== "name") {
        throw new Error("Expected collection page to reflect the updated default sort.");
      }

      click(root.querySelector("#card-open-card-448"));
      await flushMicrotasks();

      if (root.querySelector("#detail-showcase").getAttribute("data-tilt-enabled") !== "false") {
        throw new Error("Expected detail showcase to reflect the disabled tilt setting.");
      }
    }),
    runCase("card showcase selects a supported browser locale by default", async () => {
      const { root } = createMountedApp({ locale: "ko-KR" });
      await flushMicrotasks();

      if (!root.querySelector("#nav-dashboard").textContent.includes("대시보드")) {
        throw new Error("Expected dashboard navigation label to follow the supported browser locale.");
      }

      if (!root.querySelector("#global-status-bar").textContent.includes("컬렉션 런타임")) {
        throw new Error("Expected shared UI chrome to use the detected Korean locale.");
      }
    }),
    runCase("card showcase switches languages from the settings page", async () => {
      const { root } = createMountedApp({ locale: "en" });
      await flushMicrotasks();

      click(root.querySelector("#nav-settings"));
      await flushMicrotasks();

      changeValue(root.querySelector("#settings-language-select"), "ja");
      await flushMicrotasks();

      if (!root.querySelector("#nav-collection").textContent.includes("コレクション")) {
        throw new Error("Expected navigation labels to update after changing the locale.");
      }

      if (!root.querySelector("#settings-language-select").value.includes("ja")) {
        throw new Error("Expected the settings page to keep the selected locale.");
      }
    }),
    runCase("card showcase uses the local pokemon name dictionary before any API fallback", async () => {
      const { root } = createMountedApp({ locale: "ko-KR", dataMode: "local" });
      await flushMicrotasks();

      click(root.querySelector("#nav-collection"));
      await flushMicrotasks();

      const collectionText = root.querySelector("#page-collection")?.textContent ?? "";

      if (!collectionText.includes("\ud53c\uce74\uce04")) {
        throw new Error(`Expected the local Korean name dictionary to drive card titles, received ${collectionText}.`);
      }
    }),
    runCase("card showcase shows a runtime notice when the remote catalog falls back", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = () => Promise.reject(new Error("network unavailable"));

      try {
        const { root } = createMountedApp({ dataMode: "remote" });
        await flushMicrotasks();
        await flushMicrotasks();

        const notice = root.querySelector("#runtime-notice-message");

        if (!notice) {
          throw new Error("Expected a runtime notice to appear when the remote catalog fails.");
        }

        if (!notice.textContent.includes("fallback gallery")) {
          throw new Error("Expected the runtime notice to explain that the built-in fallback gallery is active.");
        }
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.__CARD_SHOWCASE_DATA_MODE__ = "local";
      }
    }),
    runCase("runtime inspector reports img src patches and highlights the live probe", async () => {
      const runtimeBridge = {
        snapshot: null,
        listeners: new Set(),
        getSnapshot() {
          return this.snapshot;
        },
        publish(nextSnapshot) {
          this.snapshot = nextSnapshot;

          for (const listener of this.listeners) {
            listener(nextSnapshot);
          }
        },
        subscribe(listener) {
          this.listeners.add(listener);
          return () => {
            this.listeners.delete(listener);
          };
        },
      };
      const { root } = createMountedApp({
        props: { runtimeBridge },
      });
      await flushMicrotasks();

      click(root.querySelector("#nav-settings"));
      await flushMicrotasks();

      const highResToggle = root.querySelector("#settings-highres-toggle");
      highResToggle.checked = false;
      highResToggle.dispatchEvent(new Event("change", { bubbles: true }));
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();

      const patchText = root.querySelector("#runtime-inspector-patches").textContent;

      if (!patchText.includes("SET_PROP: src")) {
        throw new Error("Expected runtime inspector to report img src patch activity.");
      }

      const probe = root.querySelector("#runtime-inspector-probe");

      if (!probe || probe.getAttribute("data-patch-highlighted") !== "true") {
        throw new Error("Expected runtime probe image container to receive a patch highlight.");
      }
    }),
    runCase("collection page virtualizes a large catalog instead of rendering every card at once", async () => {
      const root = document.createElement("div");
      const cards = createMockCards(48);

      function CollectionHarness() {
        const copy = getLocaleMessages("en");

        return h(CollectionPage, {
          cards: cards.slice(0, 18),
          visibleCount: cards.length,
          renderedCount: 18,
          totalCount: cards.length,
          cardsPerRow: 3,
          topSpacerHeight: 0,
          bottomSpacerHeight: 1680,
          searchKeyword: "",
          typeFilter: "all",
          favoritesOnly: false,
          sortMode: "number",
          typeLabels: { grass: "Grass" },
          copy,
          settings: {
            tiltEnabled: true,
            glareEnabled: true,
            highResImage: true,
          },
          selectedCardId: cards[0].id,
          emptyMessage: "No cards match the current collection filters.",
          onViewportScroll() {},
          onSearchInput() {},
          onTypeFilterChange() {},
          onFavoritesToggle() {},
          onSortChange() {},
          onNavigate() {},
          onSelectCard() {},
          onToggleFavorite() {},
          onPointerMove() {},
          onPointerLeave() {},
        });
      }

      createApp({
        root,
        component: CollectionHarness,
      }).mount();

      const scrollArea = root.querySelector("#collection-scroll-area");
      const resultCount = root.querySelector("#collection-result-count")?.textContent ?? "";

      if (!scrollArea) {
        throw new Error("Expected the collection page to render a dedicated virtualized scroll container.");
      }

      if (!resultCount.includes("48 matched") || !resultCount.includes("18 cards rendered in view")) {
        throw new Error("Expected the collection toolbar to show both matched and rendered counts.");
      }
    }),
  ]);
}
