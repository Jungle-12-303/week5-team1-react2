/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 앱의 핵심 사용자 흐름을 검증한다.
 */

import { createApp, h } from "../index.js";
import { App } from "../app/App.js";
import { CollectionPage } from "../app/pages/CollectionPage.js";

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
