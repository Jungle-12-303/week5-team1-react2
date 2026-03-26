/*
 * Responsibility:
 * - h()가 받은 children 입력을 canonical children 배열로 정규화한다.
 * - 배열 평탄화, primitive -> text vnode 변환, 무시해야 할 값 제거를 담당한다.
 *
 * Relationships:
 * - vnode/h.js에서 직접 사용한다.
 */

import { createTextVNode } from "./index.js";
import { flattenArray, isArray, isDefined, isNumber, isString } from "../shared/utils.js";

function isIgnoredChild(value) {
  return value === null || value === undefined || value === false || value === true;
}

function normalizeSingleChild(child) {
  if (isIgnoredChild(child)) {
    return null;
  }

  if (isString(child) || isNumber(child)) {
    return createTextVNode(child);
  }

  return child;
}

/**
 * 목적:
 * - 다양한 child 입력을 VNode 배열로 정규화한다.
 *
 * 상세 로직:
 * - 중첩 배열은 모두 풀어낸다.
 * - string / number는 text vnode로 바꾼다.
 * - null / undefined / boolean은 렌더링 대상에서 제거한다.
 */
export function normalizeChildren(children) {
  const rawChildren = isArray(children) ? children : [children];
  const flatChildren = flattenArray(rawChildren);

  return flatChildren
    .map(normalizeSingleChild)
    .filter((child) => isDefined(child));
}
