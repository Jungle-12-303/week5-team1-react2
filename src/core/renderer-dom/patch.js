/*
 * Responsibility:
 * - flat patch list를 실제 DOM에 적용한다.
 * - path 기반 대상 탐색, DOM 교체/이동/속성 반영을 담당한다.
 */

import { PATCH_TYPES } from "../reconciler/patchTypes.js";
import { createDomFromVNode } from "./createDom.js";
import { applyDomProp } from "./applyProps.js";
import { setEvent, removeEvent } from "./applyEvents.js";

function getDomNodeByPath(rootDom, path = []) {
  let current = rootDom;

  for (const index of path) {
    if (!current || !current.childNodes || !current.childNodes[index]) {
      throw new Error(`Invalid patch path: ${path.join(".")}`);
    }

    current = current.childNodes[index];
  }

  return current;
}

function getParentByPath(rootDom, parentPath = []) {
  return getDomNodeByPath(rootDom, parentPath);
}

/**
 * 목적:
 * - 단일 patch를 DOM에 적용한다.
 *
 * 부작용:
 * - rootDom 하위 DOM 구조를 직접 변경한다.
 */
export function applySinglePatch(rootDom, patch, context = {}) {
  switch (patch.type) {
    case PATCH_TYPES.SET_PROP: {
      const target = getDomNodeByPath(rootDom, patch.path);
      applyDomProp(target, patch.name, patch.value);
      return;
    }

    case PATCH_TYPES.REMOVE_PROP: {
      const target = getDomNodeByPath(rootDom, patch.path);
      applyDomProp(target, patch.name, null);
      return;
    }

    case PATCH_TYPES.SET_TEXT: {
      const target = getDomNodeByPath(rootDom, patch.path);
      target.textContent = patch.value;
      return;
    }

    case PATCH_TYPES.INSERT_CHILD: {
      const parent = getParentByPath(rootDom, patch.path);
      const nextSibling = parent.childNodes[patch.index] ?? null;
      const newNode = createDomFromVNode(patch.node, context.documentRef ?? document);
      parent.insertBefore(newNode, nextSibling);
      return;
    }

    case PATCH_TYPES.REMOVE_CHILD: {
      const parent = getParentByPath(rootDom, patch.path);
      const child = parent.childNodes[patch.index];

      if (!child) {
        throw new Error(`Cannot remove child at index ${patch.index}`);
      }

      parent.removeChild(child);
      return;
    }

    case PATCH_TYPES.MOVE_CHILD: {
      const parent = getParentByPath(rootDom, patch.path);
      const child = parent.childNodes[patch.fromIndex];

      if (!child) {
        throw new Error(`Cannot move child from index ${patch.fromIndex}`);
      }

      const nextSibling = parent.childNodes[patch.toIndex] ?? null;
      parent.insertBefore(child, nextSibling);
      return;
    }

    case PATCH_TYPES.REPLACE_NODE: {
      const target = getDomNodeByPath(rootDom, patch.path);
      const replacement = createDomFromVNode(patch.node, context.documentRef ?? document);
      target.replaceWith(replacement);
      return;
    }

    case PATCH_TYPES.SET_EVENT: {
      const target = getDomNodeByPath(rootDom, patch.path);
      setEvent(target, patch.name, patch.handler);
      return;
    }

    case PATCH_TYPES.REMOVE_EVENT: {
      const target = getDomNodeByPath(rootDom, patch.path);
      removeEvent(target, patch.name);
      return;
    }

    default:
      throw new Error(`Unsupported patch type: ${patch.type}`);
  }
}

/**
 * 목적:
 * - patch list 전체를 순차 적용한다.
 */
export function applyPatches(rootDom, patches = [], context = {}) {
  for (const patch of patches) {
    applySinglePatch(rootDom, patch, context);
  }

  return {
    appliedCount: patches.length,
  };
}
