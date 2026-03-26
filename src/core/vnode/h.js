/*
 * Responsibility:
 * - 선언형 VNode 생성 진입점 h(tag, props, ...children)을 제공한다.
 * - props에서 key와 events를 분리하고, children을 canonical shape로 정규화한다.
 *
 * Relationships:
 * - samples, tests, future JSX-like entrypoint가 이 함수를 사용한다.
 */

import { createElementVNode } from "./index.js";
import { normalizeChildren } from "./normalizeChildren.js";
import { RESERVED_PROPS } from "../shared/constants.js";
import { isFunction, isObject, toEventName } from "../shared/utils.js";

function normalizeProps(rawProps) {
  if (!isObject(rawProps)) {
    return { key: null, props: {}, events: {} };
  }

  const props = {};
  const events = {};
  let key = null;

  for (const [name, value] of Object.entries(rawProps)) {
    if (name === RESERVED_PROPS.KEY) {
      key = value ?? null;
      continue;
    }

    const eventName = toEventName(name);

    if (eventName && isFunction(value)) {
      events[eventName] = value;
      continue;
    }

    props[name] = value;
  }

  return { key, props, events };
}

/**
 * 목적:
 * - React.createElement와 유사한 최소 선언형 진입점을 제공한다.
 *
 * 입력:
 * - tag: 태그 이름
 * - props: key / 일반 prop / 이벤트 prop
 * - children: primitive, VNode, 배열의 조합
 *
 * 반환:
 * - canonical element vnode
 */
export function h(tag, props, ...children) {
  const normalized = normalizeProps(props);

  return createElementVNode(tag, {
    key: normalized.key,
    props: normalized.props,
    events: normalized.events,
    children: normalizeChildren(children),
    meta: {
      source: "declarative",
    },
  });
}
