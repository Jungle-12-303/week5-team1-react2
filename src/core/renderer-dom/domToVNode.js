/*
 * Responsibility:
 * - 실제 DOM Node를 canonical VNode로 변환한다.
 * - DOM -> VDOM 경로에서는 이벤트를 복원하지 않는 정책을 따른다.
 */

import { createElementVNode, createTextVNode } from "../vnode/index.js";

function normalizeAttributeName(name) {
  return name === "class" ? "className" : name;
}

function readElementKey(element) {
  if (element.hasAttribute("key")) {
    return element.getAttribute("key");
  }

  return null;
}

function readProps(element) {
  const props = {};

  for (const attribute of element.attributes) {
    if (attribute.name === "key") {
      continue;
    }

    props[normalizeAttributeName(attribute.name)] = attribute.value;
  }

  return props;
}

function shouldKeepTextNode(text, options) {
  if (options.preserveWhitespace) {
    return true;
  }

  return !/^\s*$/.test(text);
}

/**
 * 목적:
 * - DOM Node를 VNode로 바꾼다.
 */
export function domToVNode(domNode, options = {}) {
  if (!domNode) {
    return null;
  }

  if (domNode.nodeType === Node.TEXT_NODE) {
    const text = domNode.textContent ?? "";

    if (!shouldKeepTextNode(text, options)) {
      return null;
    }

    return createTextVNode(text, {
      source: "dom",
    });
  }

  if (domNode.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const children = Array.from(domNode.childNodes)
    .map((childNode) => domToVNode(childNode, options))
    .filter(Boolean);

  return createElementVNode(domNode.tagName.toLowerCase(), {
    key: readElementKey(domNode),
    props: readProps(domNode),
    events: {},
    children,
    meta: {
      source: "dom",
    },
  });
}
