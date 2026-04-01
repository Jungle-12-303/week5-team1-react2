/*
 * Responsibility:
 * - 자식 노드 배열의 차이를 계산한다.
 * - auto/index/keyed 모드에 따라 child 매칭 전략을 분기한다.
 *
 * Relationships:
 * - diff.js가 노드 단위 비교 후 children 세부 계산을 위임한다.
 */

import { DIFF_MODES, PATCH_TYPES } from "../shared/constants.js";
import { getNodeIdentity } from "../vnode/index.js";

function appendIndexPatch(patches, indexPatch) {
  if (indexPatch && indexPatch.length > 0) {
    patches.push(...indexPatch);
  }
}

function createInsertPatch(parentPath, index, node) {
  return {
    type: PATCH_TYPES.INSERT_CHILD,
    path: parentPath,
    index,
    node,
  };
}

function createRemovePatch(parentPath, index) {
  return {
    type: PATCH_TYPES.REMOVE_CHILD,
    path: parentPath,
    index,
  };
}

function createMovePatch(parentPath, fromIndex, toIndex, key) {
  return {
    type: PATCH_TYPES.MOVE_CHILD,
    path: parentPath,
    fromIndex,
    toIndex,
    key,
  };
}

function diffChildrenByIndex(oldChildren, newChildren, parentPath, walk) {
  const patches = [];
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < maxLength; index += 1) {
    // index 모드는 "같은 위치의 child끼리 비교"하는 가장 단순한 전략이다.
    const oldChild = oldChildren[index];
    const newChild = newChildren[index];
    const childPath = [...parentPath, index];

    if (!oldChild && newChild) {
      patches.push(createInsertPatch(parentPath, index, newChild));
      continue;
    }

    if (oldChild && !newChild) {
      patches.push(createRemovePatch(parentPath, index));
      continue;
    }

    appendIndexPatch(patches, walk(oldChild, newChild, childPath));
  }

  return patches;
}

function hasAnyKey(children) {
  return children.some((child) => child?.key !== null && child?.key !== undefined);
}

function buildKeyedMap(children) {
  const map = new Map();

  children.forEach((child, index) => {
    map.set(getNodeIdentity(child, index), { child, index });
  });

  return map;
}

function diffChildrenByKey(oldChildren, newChildren, parentPath, walk, mode) {
  const patches = [];
  // keyed 모드는 key 또는 identity를 기준으로 "같은 child가 어디로 이동했는지" 추적한다.
  const oldMap = buildKeyedMap(oldChildren);
  const visited = new Set();

  newChildren.forEach((newChild, newIndex) => {
    const identity = getNodeIdentity(newChild, newIndex);
    const oldEntry = oldMap.get(identity);

    if (!oldEntry) {
      patches.push(createInsertPatch(parentPath, newIndex, newChild));
      return;
    }

    visited.add(identity);

    if (oldEntry.index !== newIndex && newChild?.key !== null && newChild?.key !== undefined) {
      patches.push(createMovePatch(parentPath, oldEntry.index, newIndex, newChild.key));
    }

    appendIndexPatch(patches, walk(oldEntry.child, newChild, [...parentPath, newIndex]));
  });

  oldChildren.forEach((oldChild, oldIndex) => {
    const identity = getNodeIdentity(oldChild, oldIndex);

    if (!visited.has(identity)) {
      patches.push(createRemovePatch(parentPath, oldIndex));
    }
  });

  if (mode === DIFF_MODES.AUTO && !hasAnyKey(newChildren) && !hasAnyKey(oldChildren)) {
    return diffChildrenByIndex(oldChildren, newChildren, parentPath, walk);
  }

  return patches;
}

/**
 * 목적:
 * - child 배열 차이를 diff 모드에 따라 계산한다.
 *
 * 입력:
 * - oldChildren, newChildren: 비교 대상 child 배열
 * - parentPath: 부모 노드 path
 * - options.mode: auto | index | keyed
 * - walk: 노드 단위 재귀 diff 함수
 */
export function diffChildren(oldChildren = [], newChildren = [], parentPath = [], options = {}, walk) {
  const mode = options.mode ?? DIFF_MODES.AUTO;

  if (mode === DIFF_MODES.INDEX) {
    return diffChildrenByIndex(oldChildren, newChildren, parentPath, walk);
  }

  if (mode === DIFF_MODES.KEYED) {
    return diffChildrenByKey(oldChildren, newChildren, parentPath, walk, mode);
  }

  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    // auto 모드에서는 key가 하나라도 보이면 keyed 전략을 택한다.
    return diffChildrenByKey(oldChildren, newChildren, parentPath, walk, DIFF_MODES.AUTO);
  }

  return diffChildrenByIndex(oldChildren, newChildren, parentPath, walk);
}
