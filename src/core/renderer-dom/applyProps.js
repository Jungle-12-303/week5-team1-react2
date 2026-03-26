/*
 * Responsibility:
 * - DOM element에 일반 prop/property를 반영한다.
 * - boolean prop, className, value 계열 같은 DOM 특수 케이스를 처리한다.
 */

import { BOOLEAN_PROPS } from "../shared/constants.js";

function isPropertyBinding(name) {
  return name === "value" || name === "checked" || name === "selected";
}

/**
 * 목적:
 * - 단일 prop을 DOM에 적용한다.
 */
export function applyDomProp(element, name, value) {
  if (name === "className") {
    element.className = value ?? "";
    return;
  }

  if (BOOLEAN_PROPS.has(name)) {
    element[name] = Boolean(value);

    if (!value) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, "");
    }

    return;
  }

  if (isPropertyBinding(name)) {
    element[name] = value ?? "";
    return;
  }

  if (value === null || value === undefined) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, String(value));
}

/**
 * 목적:
 * - 여러 props를 순회하며 DOM에 반영한다.
 */
export function applyProps(element, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    applyDomProp(element, name, value);
  }

  return element;
}
