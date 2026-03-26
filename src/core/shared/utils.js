/*
 * Responsibility:
 * - 코어 로직 전반에서 반복 사용하는 작은 유틸리티를 제공한다.
 * - 자료형 판별, 배열 평탄화, 이벤트 이름 정규화 같은 저수준 도우미를 모은다.
 *
 * Inputs/Outputs:
 * - 각 함수는 작은 단일 연산을 수행하고 결과를 반환한다.
 *
 * Relationships:
 * - vnode, reconciler, renderer-dom 모듈이 공통 사용한다.
 */

import { EVENT_PREFIX } from "./constants.js";

export function isArray(value) {
  return Array.isArray(value);
}

export function isString(value) {
  return typeof value === "string";
}

export function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isFunction(value) {
  return typeof value === "function";
}

export function isObject(value) {
  return value !== null && typeof value === "object";
}

export function isDefined(value) {
  return value !== undefined && value !== null;
}

export function flattenArray(values, output = []) {
  for (const value of values) {
    if (isArray(value)) {
      flattenArray(value, output);
      continue;
    }

    output.push(value);
  }

  return output;
}

export function toEventName(propName) {
  if (!isString(propName) || !propName.startsWith(EVENT_PREFIX) || propName.length <= 2) {
    return null;
  }

  return propName.slice(2).toLowerCase();
}

export function clonePath(path) {
  return path.slice();
}

export function shallowEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (!isObject(a) || !isObject(b)) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

export function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
