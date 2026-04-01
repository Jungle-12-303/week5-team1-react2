/*
 * Responsibility:
 * - 자식 함수형 컴포넌트를 일반 VNode 트리로 전개한다.
 *
 * Easy explanation:
 * - h(Card, props) 같은 함수형 자식은 브라우저가 바로 이해할 수 없다.
 * - 그래서 Card(props)를 실제로 호출해서 div, span, text 같은 일반 VNode로 풀어내야 한다.
 * - 이 파일은 그 "함수 컴포넌트 해석기"다.
 */

import { createTextVNode } from "../vnode/index.js";
import { normalizeChildren } from "../vnode/normalizeChildren.js";
import { isArray, isFunction } from "../shared/utils.js";
import { runWithHooksDisabled } from "./currentDispatcher.js";

function normalizeResolvedValue(value) {
  // 빈 값은 렌더 트리에서 안전하게 다룰 수 있도록 빈 텍스트 노드로 정규화한다.
  if (value === null || value === undefined || value === false || value === true) {
    return createTextVNode("");
  }

  if (typeof value === "string" || typeof value === "number") {
    return createTextVNode(value);
  }

  if (isArray(value)) {
    throw new Error("Child components must return a single VNode.");
  }

  return value;
}

function resolveChildren(children = []) {
  return normalizeChildren(children).map((child) => resolveComponentTree(child));
}

export function resolveComponentTree(inputVNode) {
  const vnode = normalizeResolvedValue(inputVNode);

  if (vnode.type === "text") {
    return vnode;
  }

  if (!isFunction(vnode.tag)) {
    // 일반 DOM 태그라면 자식만 재귀적으로 전개하면 된다.
    return {
      ...vnode,
      children: resolveChildren(vnode.children),
    };
  }

  const nextProps = {
    ...(vnode.props ?? {}),
    children: vnode.children ?? [],
  };

  // 함수 컴포넌트는 이 시점에 즉시 실행해 실제 VNode로 바꾼다.
  const resolved = runWithHooksDisabled(() => vnode.tag(nextProps));
  const resolvedTree = resolveComponentTree(resolved);

  if ((resolvedTree.key === null || resolvedTree.key === undefined) && vnode.key !== null && vnode.key !== undefined) {
    return {
      ...resolvedTree,
      key: vnode.key,
    };
  }

  return resolvedTree;
}
