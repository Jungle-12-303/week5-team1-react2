/*
 * Responsibility:
 * - flat patch list를 실제 DOM에 적용한다.
 * - path 기반 대상 탐색, DOM 교체/이동/속성 반영을 담당한다.
 *
 * Easy explanation:
 * - diff가 계산한 patch 목록을 실제 DOM 조작으로 옮기는 마지막 단계다.
 * - 즉, "무엇을 바꿀까"가 diff라면, "실제로 바꾸기"는 patch다.
 */

import { PATCH_TYPES } from "../reconciler/patchTypes.js";
import { createDomFromVNode } from "./createDom.js";
import { applyDomProp } from "./applyProps.js";
import { setEvent, removeEvent } from "./applyEvents.js";

const PATCH_HIGHLIGHT_CLASS = "is-patch-highlighted";

function arePathsEqual(leftPath = [], rightPath = []) {
  // path는 [0, 2, 1]처럼 "루트 아래 몇 번째 child로 내려갈지"를 나타내는 인덱스 배열이다.
  // 두 patch가 같은 DOM 위치를 가리키는지 확인할 때만 쓰는 아주 얇은 helper다.
  if (leftPath.length !== rightPath.length) {
    return false;
  }

  return leftPath.every((segment, index) => segment === rightPath[index]);
}

function orderPatches(patches = []) {
  // diff는 flat patch list를 만들지만, 적용 순서는 약간 보정이 필요하다.
  // 특히 같은 parent/path에 대해 remove와 insert가 같이 있으면
  // remove를 먼저 해야 child index가 밀리지 않고 안전하다.
  //
  // 예:
  // - child[1] 삭제
  // - child[1] 위치에 새 노드 삽입
  // 위 두 작업은 insert를 먼저 하면 기존 index 해석이 틀어질 수 있다.
  return patches
    .map((patch, originalIndex) => ({ patch, originalIndex }))
    .sort((left, right) => {
      const leftPatch = left.patch;
      const rightPatch = right.patch;
      const leftIsRemove = leftPatch.type === PATCH_TYPES.REMOVE_CHILD;
      const rightIsRemove = rightPatch.type === PATCH_TYPES.REMOVE_CHILD;
      const leftIsInsert = leftPatch.type === PATCH_TYPES.INSERT_CHILD;
      const rightIsInsert = rightPatch.type === PATCH_TYPES.INSERT_CHILD;

      if (arePathsEqual(leftPatch.path, rightPatch.path)) {
        if (leftIsRemove && rightIsInsert) {
          // 같은 위치에 대해 remove와 insert가 같이 있으면 remove를 먼저 적용한다.
          return -1;
        }

        if (leftIsInsert && rightIsRemove) {
          return 1;
        }
      }

      if (leftIsRemove && rightIsRemove && arePathsEqual(leftPatch.path, rightPatch.path)) {
        // 같은 parent에서 여러 child를 지울 때는 뒤 인덱스부터 제거해야 앞 인덱스가 안 밀린다.
        return rightPatch.index - leftPatch.index;
      }

      // 그 외에는 diff가 만든 원래 순서를 유지한다.
      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.patch);
}

function getDomNodeByPath(rootDom, path = []) {
  // path 기반 탐색기.
  // rootDom을 기준으로 childNodes[index]를 순서대로 타고 내려가 실제 DOM node를 찾는다.
  //
  // 예:
  // path = [2, 1]
  // -> rootDom.childNodes[2]
  // -> 그 노드의 childNodes[1]
  let current = rootDom;
  // path가 빈 배열이면 루트 자체를 뜻하므로 current(rootDom)를 그대로 반환한다.

  for (const index of path) {
    if (!current || !current.childNodes || !current.childNodes[index]) {
      // diff가 계산한 path와 실제 DOM 구조가 어긋났다는 뜻이다.
      // patch 단계는 path를 신뢰하고 바로 적용하기 때문에, 이 경우는 숨기지 않고 바로 실패시킨다.
      throw new Error(`Invalid patch path: ${path.join(".")}`);
    }

    current = current.childNodes[index];
  }

  return current;
}

function getParentByPath(rootDom, parentPath = []) {
  // child 삽입/삭제/이동은 대상 노드보다 "부모 노드"가 필요하다.
  // 의미상 helper를 분리했지만 내부 동작은 getDomNodeByPath와 같다.
  return getDomNodeByPath(rootDom, parentPath);
}

function resolveHighlightTarget(node) {
  // 시각적 디버깅용 helper.
  // patch가 text node에 적용될 때는 text node 자체에 class를 못 붙이므로
  // parentElement나 data-patch-highlight-root가 달린 조상 element를 찾아 highlight 대상으로 삼는다.
  if (!node) {
    return null;
  }

  const baseNode = node.nodeType === 3 ? node.parentElement : node;

  if (!baseNode) {
    return null;
  }

  if (typeof baseNode.closest === "function") {
    return baseNode.closest("[data-patch-highlight-root='true']") ?? baseNode;
  }

  let current = baseNode;

  while (current) {
    if (typeof current.getAttribute === "function" && current.getAttribute("data-patch-highlight-root") === "true") {
      return current;
    }

    current = current.parentElement ?? current.parentNode ?? null;
  }

  return baseNode;
}

function highlightPatchedNode(node) {
  // 실제 patch가 적용된 뒤 "어디가 바뀌었는지" 눈으로 보이게 하는 보조 기능이다.
  // 디버그/데모용 하이라이트라서 patch 자체의 correctness와는 별개다.
  const target = resolveHighlightTarget(node);

  if (!target) {
    return;
  }

  if (target.__patchHighlightTimer) {
    // 같은 노드에 연속 patch가 들어오면 이전 타이머를 지우고 highlight 시간을 다시 시작한다.
    clearTimeout(target.__patchHighlightTimer);
  }

  if (target.classList) {
    // CSS 애니메이션을 다시 발동시키기 위해 class를 뺐다가 강제 reflow 후 다시 붙인다.
    target.classList.remove(PATCH_HIGHLIGHT_CLASS);
    void target.offsetWidth;
    target.classList.add(PATCH_HIGHLIGHT_CLASS);
  }
  if (typeof target.setAttribute === "function") {
    target.setAttribute("data-patch-highlighted", "true");
  }
  target.__patchHighlightTimer = setTimeout(() => {
    if (target.classList) {
      target.classList.remove(PATCH_HIGHLIGHT_CLASS);
    }
    if (typeof target.removeAttribute === "function") {
      target.removeAttribute("data-patch-highlighted");
    }
    target.__patchHighlightTimer = null;
  }, 2400);
}

/**
 * 목적:
 * - 단일 patch를 DOM에 적용한다.
 *
 * 부작용:
 * - rootDom 하위 DOM 구조를 직접 변경한다.
 */
export function applySinglePatch(rootDom, patch, context = {}) {
  // patch는 이미 diff 단계에서 계산이 끝난 결과이므로,
  // 여기서는 "다시 비교"하지 않고 지정된 path의 DOM만 바로 조작한다.
  switch (patch.type) {
    case PATCH_TYPES.SET_PROP: {
      // 대상 element 하나를 찾아 props 한 개만 변경한다.
      const target = getDomNodeByPath(rootDom, patch.path);
      applyDomProp(target, patch.name, patch.value);
      highlightPatchedNode(target);
      return;
    }

    case PATCH_TYPES.REMOVE_PROP: {
      // prop 제거도 applyDomProp에 null을 넘겨 통일된 경로로 처리한다.
      const target = getDomNodeByPath(rootDom, patch.path);
      applyDomProp(target, patch.name, null);
      highlightPatchedNode(target);
      return;
    }

    case PATCH_TYPES.SET_TEXT: {
      // text vnode는 실제 DOM에서 text node 하나이므로 textContent만 바꾸면 된다.
      const target = getDomNodeByPath(rootDom, patch.path);
      target.textContent = patch.value;
      highlightPatchedNode(target);
      return;
    }

    case PATCH_TYPES.INSERT_CHILD: {
      // 새 child를 삽입할 때는 parent와 "그 위치의 nextSibling"을 찾아 insertBefore로 넣는다.
      // nextSibling이 없으면 null이 되어 append처럼 동작한다.
      const parent = getParentByPath(rootDom, patch.path);
      const nextSibling = parent.childNodes[patch.index] ?? null;
      const newNode = createDomFromVNode(patch.node, context.documentRef ?? document);
      parent.insertBefore(newNode, nextSibling);
      highlightPatchedNode(newNode);
      return;
    }

    case PATCH_TYPES.REMOVE_CHILD: {
      // 삭제는 parent 기준 인덱스로 child를 직접 찾아 removeChild 한다.
      const parent = getParentByPath(rootDom, patch.path);
      const child = parent.childNodes[patch.index];

      if (!child) {
        throw new Error(`Cannot remove child at index ${patch.index}`);
      }

      parent.removeChild(child);
      highlightPatchedNode(parent);
      return;
    }

    case PATCH_TYPES.MOVE_CHILD: {
      // keyed diff에서 reorder가 일어난 경우 child를 새 위치로 옮긴다.
      // DOM node를 새로 만들지 않고 기존 child를 insertBefore로 재배치한다.
      const parent = getParentByPath(rootDom, patch.path);
      const child = parent.childNodes[patch.fromIndex];

      if (!child) {
        throw new Error(`Cannot move child from index ${patch.fromIndex}`);
      }

      const nextSibling = parent.childNodes[patch.toIndex] ?? null;
      parent.insertBefore(child, nextSibling);
      highlightPatchedNode(child);
      return;
    }

    case PATCH_TYPES.REPLACE_NODE: {
      // 노드 타입이 크게 달라졌거나 완전 교체가 필요할 때 새 DOM을 만들고 replaceWith 한다.
      const target = getDomNodeByPath(rootDom, patch.path);
      const replacement = createDomFromVNode(patch.node, context.documentRef ?? document);
      target.replaceWith(replacement);
      highlightPatchedNode(replacement);
      return;
    }

    case PATCH_TYPES.SET_EVENT: {
      // 이벤트는 props와 따로 관리된다.
      // renderer-dom/applyEvents 계층 helper를 재사용해 핸들러를 붙인다.
      const target = getDomNodeByPath(rootDom, patch.path);
      setEvent(target, patch.name, patch.handler);
      return;
    }

    case PATCH_TYPES.REMOVE_EVENT: {
      // 이벤트 제거도 전용 helper로 위임한다.
      const target = getDomNodeByPath(rootDom, patch.path);
      removeEvent(target, patch.name);
      return;
    }

    default:
      // patch type enum이 늘었는데 renderer가 처리법을 모르면 숨기지 않고 즉시 실패한다.
      throw new Error(`Unsupported patch type: ${patch.type}`);
  }
}

/**
 * 목적:
 * - patch list 전체를 순차 적용한다.
 */
export function applyPatches(rootDom, patches = [], context = {}) {
  // [업데이트 8-1] patch 목록을 안전한 순서로 정렬한 뒤 하나씩 DOM에 적용한다.
  // remove/insert 순서가 엉키면 DOM 인덱스가 틀어질 수 있으므로,
  // orderPatches로 안전한 적용 순서를 먼저 만든다.
  for (const patch of orderPatches(patches)) {
    // patch는 flat list이므로 트리를 다시 순회하지 않고 각 항목을 독립적으로 실행한다.
    applySinglePatch(rootDom, patch, context);
  }

  return {
    appliedCount: patches.length,
  };
}
