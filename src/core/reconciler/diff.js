/*
 * Responsibility:
 * - 이전/현재 VNode 트리를 비교해 flat patch list를 생성한다.
 * - 노드 단위 분기(type/tag/text)와 props/events/children 위임을 조정한다.
 *
 * Relationships:
 * - engine.patch(), tests, diff 설명 문서가 이 함수 계약을 기준으로 한다.
 *
 * Easy explanation:
 * - diff는 이전 화면 설명서와 새 화면 설명서를 비교해서,
 *   정확히 무엇을 바꾸면 되는지 patch 목록으로 계산한다.
 */

import { DIFF_MODES, PATCH_TYPES } from "../shared/constants.js";
import { diffProps } from "./diffProps.js";
import { diffChildren } from "./diffChildren.js";

function diffEvents(oldEvents = {}, newEvents = {}, path = []) {
  const patches = [];
  const eventNames = new Set([...Object.keys(oldEvents), ...Object.keys(newEvents)]);

  for (const name of eventNames) {
    const hasOld = Object.prototype.hasOwnProperty.call(oldEvents, name);
    const hasNew = Object.prototype.hasOwnProperty.call(newEvents, name);

    if (!hasNew && hasOld) {
      patches.push({
        type: PATCH_TYPES.REMOVE_EVENT,
        path,
        name,
      });
      continue;
    }

    if (!hasOld && hasNew) {
      patches.push({
        type: PATCH_TYPES.SET_EVENT,
        path,
        name,
        handler: newEvents[name],
      });
      continue;
    }

    if (oldEvents[name] !== newEvents[name]) {
      patches.push({
        type: PATCH_TYPES.SET_EVENT,
        path,
        name,
        handler: newEvents[name],
      });
    }
  }

  return patches;
}

function createReplacePatch(path, node) {
  return [
    {
      type: PATCH_TYPES.REPLACE_NODE,
      path,
      node,
    },
  ];
}

function walk(oldVNode, newVNode, path, options) {
  // [업데이트 7-1] walk는 트리를 재귀적으로 따라가며
  // path 기반의 flat patch list를 만든다.
  // walk는 old/new VNode를 재귀적으로 따라가며
  // "어떤 위치(path)에 어떤 patch가 필요한지"를 flat 배열로 모은다.
  if (!oldVNode && newVNode) {
    return createReplacePatch(path, newVNode);
  }

  if (oldVNode && !newVNode) {
    return [
      {
        type: PATCH_TYPES.REMOVE_CHILD,
        path: path.slice(0, -1),
        index: path[path.length - 1],
      },
    ];
  }

  if (oldVNode.type !== newVNode.type) {
    return createReplacePatch(path, newVNode);
  }

  if (oldVNode.type === "text") {
    if (oldVNode.text === newVNode.text) {
      return [];
    }

    return [
      {
        type: PATCH_TYPES.SET_TEXT,
        path,
        value: newVNode.text,
      },
    ];
  }

  if (oldVNode.tag !== newVNode.tag) {
    return createReplacePatch(path, newVNode);
  }

  const patches = [];
  // 현재 노드의 props/events 차이를 먼저 계산하고,
  // children 비교는 diffChildren에 위임한다.
  patches.push(...diffProps(oldVNode.props, newVNode.props, path));
  patches.push(...diffEvents(oldVNode.events, newVNode.events, path));
  patches.push(
    ...diffChildren(oldVNode.children, newVNode.children, path, options, (nextOld, nextNew, nextPath) =>
      walk(nextOld, nextNew, nextPath, options)
    )
  );

  return patches;
}

/**
 * 목적:
 * - 두 VNode 트리를 비교해 flat patch list를 만든다.
 *
 * 입력:
 * - oldVNode, newVNode
 * - options.mode: auto | index | keyed
 *
 * 반환:
 * - Patch[]
 */
export function diff(oldVNode, newVNode, options = {}) {
  const mode = options.mode ?? DIFF_MODES.AUTO;

  return walk(oldVNode, newVNode, [], { mode });
}
