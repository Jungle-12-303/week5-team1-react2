/*
 * Responsibility:
 * - demo layer i18n의 언어 전환, 파라미터 치환, fallback 동작을 검증한다.
 */

import { createI18n } from "../demo/i18n.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runI18nTests() {
  return [
    runCase("default language is Korean", () => {
      const i18n = createI18n();

      if (i18n.t("language.label") !== "언어") {
        throw new Error("Expected default language to be Korean.");
      }
    }),
    runCase("language can switch to English", () => {
      const i18n = createI18n("ko");
      i18n.setLanguage("en");

      if (i18n.t("controls.runTests") !== "Run Tests") {
        throw new Error("Expected language switch to update translated output.");
      }
    }),
    runCase("formatted messages interpolate params", () => {
      const i18n = createI18n("en");
      const message = i18n.t("status.modeUpdated.detail", { mode: "Auto" });

      if (!message.includes("Auto")) {
        throw new Error("Expected translated message to interpolate params.");
      }
    }),
    runCase("missing key falls back to key text", () => {
      const i18n = createI18n("en");

      if (i18n.t("missing.translation.key") !== "missing.translation.key") {
        throw new Error("Expected missing keys to fall back to the key name.");
      }
    }),
  ];
}
