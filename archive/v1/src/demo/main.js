/*
 * Responsibility:
 * - 브라우저 진입점 역할을 하는 최소 bootstrap 파일이다.
 */

import { createDemoApp } from "./app.js";

function bootstrap() {
  const root = document.getElementById("app") ?? document.body.appendChild(document.createElement("div"));
  root.id = "app";

  createDemoApp({
    root,
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", bootstrap);
}
