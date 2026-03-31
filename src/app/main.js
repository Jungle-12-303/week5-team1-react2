/*
 * Responsibility:
 * - 브라우저에서 카드 컬렉션 쇼케이스 앱을 실제로 부트스트랩한다.
 */

import { createApp } from "../index.js";
import { App } from "./App.js";

function mountApp() {
  const root = document.getElementById("app");

  if (!root) {
    throw new Error('Expected "#app" root element for the card collection showcase app.');
  }

  createApp({
    root,
    component: App,
    batching: "microtask",
  }).mount();
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  mountApp();
} else {
  document.addEventListener("DOMContentLoaded", mountApp, { once: true });
}
