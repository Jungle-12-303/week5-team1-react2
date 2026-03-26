/*
 * Responsibility:
 * - shared utils의 순수 함수 동작을 브라우저 없이 검증한다.
 */

import {
  clonePath,
  flattenArray,
  invariant,
  isDefined,
  shallowEqual,
  toEventName,
} from "../core/shared/utils.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runUtilsTests() {
  return [
    runCase("flatten nested arrays recursively", () => {
      const result = flattenArray(["A", ["B", ["C"]], "D"]);

      if (result.join(",") !== "A,B,C,D") {
        throw new Error("Expected nested arrays to flatten in order.");
      }
    }),
    runCase("convert event prop to lowercase event name", () => {
      if (toEventName("onClick") !== "click") {
        throw new Error("Expected onClick to become click.");
      }
    }),
    runCase("reject invalid event prop names", () => {
      if (toEventName("className") !== null) {
        throw new Error("Expected non-event prop names to return null.");
      }
    }),
    runCase("clone path without mutating the original array", () => {
      const original = [0, 1, 2];
      const copy = clonePath(original);

      copy.push(3);

      if (original.length !== 3) {
        throw new Error("Expected clonePath to return a new array.");
      }
    }),
    runCase("shallowEqual returns true for equal flat objects", () => {
      if (!shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })) {
        throw new Error("Expected shallowEqual to return true.");
      }
    }),
    runCase("shallowEqual returns false for changed values", () => {
      if (shallowEqual({ a: 1 }, { a: 2 })) {
        throw new Error("Expected shallowEqual to detect changed values.");
      }
    }),
    runCase("isDefined accepts falsey but defined values", () => {
      if (!isDefined(0) || !isDefined("") || !isDefined(false)) {
        throw new Error("Expected falsey values other than null/undefined to be defined.");
      }
    }),
    runCase("invariant throws when condition is false", () => {
      let threw = false;

      try {
        invariant(false, "boom");
      } catch (error) {
        threw = error.message === "boom";
      }

      if (!threw) {
        throw new Error("Expected invariant to throw with the provided message.");
      }
    }),
  ];
}
