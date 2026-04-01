/*
 * Responsibility:
 * - VNode로부터 실제 DOM 노드를 생성한다.
 * - props, events, children 렌더링을 하위 함수로 분리해 적용한다.
 *
 * Easy explanation:
 * - 이 파일은 VNode를 실제 브라우저 DOM으로 변환한다.
 * - 최초 mount에서는 diff 없이 이 경로로 전체 화면을 만든다.
 */

import { applyProps } from "./applyProps.js";
import { applyEvents } from "./applyEvents.js";

/**
 * 목적:
 * - 단일 VNode를 실제 DOM 노드로 변환한다.
 *
 * 상세 로직:
 * - text node는 createTextNode
 * - element node는 createElement 후 props/events/children 적용
 */
export function createDomFromVNode(vnode, documentRef = document) {
  if (vnode.type === "text") {
    return documentRef.createTextNode(vnode.text ?? "");
  }

  // 최초 mount에서는 diff 없이 이 경로를 따라
  // VNode 트리 전체가 실제 DOM 트리로 재귀 생성된다.
  const element = documentRef.createElement(vnode.tag);
  applyProps(element, vnode.props);
  applyEvents(element, vnode.events);

  for (const child of vnode.children) {
    element.appendChild(createDomFromVNode(child, documentRef));
  }

  return element;
}
