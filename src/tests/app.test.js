/*
 * Responsibility:
 * - 카드 컬렉션 쇼케이스 앱의 핵심 사용자 흐름을 검증한다.
 */

import { createApp } from "../index.js";
import { App } from "../app/App.js";

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

function createMountedApp() {
  globalThis.__CARD_SHOWCASE_DATA_MODE__ = "local";
  const root = document.createElement("div");
  const app = createApp({ root, component: App, batching: "microtask" });
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

      if (!root.textContent.includes("Charizard")) {
        throw new Error("Expected collection search to show the matching card.");
      }

      if (root.textContent.includes("Pikachu")) {
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
  ]);
}
