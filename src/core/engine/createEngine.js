/*
 * Responsibility:
 * - 외부 공개 facade인 engine 인스턴스를 생성한다.
 * - current vnode, history, diff mode, DOM 동기화를 하나의 객체로 묶는다.
 *
 * Easy explanation:
 * - 이 파일은 저수준 Virtual DOM 엔진 자체를 만든다.
 * - v3에서는 FunctionComponent가 더 상위 개념이지만,
 *   실제 diff/patch/history는 여전히 이 엔진이 담당한다.
 */

import { DIFF_MODES } from "../shared/constants.js";
import { createDomFromVNode } from "../renderer-dom/createDom.js";
import { applyPatches } from "../renderer-dom/patch.js";
import { diff } from "../reconciler/diff.js";
import { createHistory } from "../history/createHistory.js";
import { pushHistory, redoHistory, undoHistory } from "../history/historyApi.js";
import { inspectEngine } from "./inspect.js";

function isValidDiffMode(mode) {
  return Object.values(DIFF_MODES).includes(mode);
}

function clearRoot(root) {
  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }
}

function getManagedDomRoot(root) {
  return root.firstChild ?? null;
}

function isDisplayPatch(patch) {
  if (!patch || typeof patch !== "object") {
    return false;
  }

  if (patch.type === "SET_EVENT" || patch.type === "REMOVE_EVENT") {
    return false;
  }

  if ((patch.type === "SET_PROP" || patch.type === "REMOVE_PROP") && typeof patch.name === "string" && patch.name.startsWith("data-")) {
    return false;
  }

  return true;
}

function countDisplayPatches(patches = []) {
  return patches.filter(isDisplayPatch).length;
}

function syncRoot(root, vnode) {
  clearRoot(root);
  root.appendChild(createDomFromVNode(vnode));
}

/**
 * 목적:
 * - 문서에서 정의한 공개 API 형태의 engine 인스턴스를 생성한다.
 *
 * 부작용:
 * - root DOM을 실제로 렌더링/patch 할 수 있다.
 */
export function createEngine(options = {}) {
  const root = options.root;

  if (!(root instanceof Element)) {
    throw new Error("createEngine requires a valid root Element.");
  }

  if (!isValidDiffMode(options.diffMode ?? DIFF_MODES.AUTO)) {
    throw new Error(`Unsupported diff mode: ${options.diffMode}`);
  }

  const state = {
    root,
    currentVNode: options.initialVNode,
    history: createHistory(options.initialVNode, {
      maxLength: options.historyLimit ?? null,
    }),
    diffMode: options.diffMode ?? DIFF_MODES.AUTO,
    lastPatches: [],
    totalPatchCount: 0,
    rawTotalPatchCount: 0,
  };

  return {
    render(vnode) {
      syncRoot(state.root, vnode);
      state.currentVNode = vnode;
      state.lastPatches = [];
      return vnode;
    },

    patch(nextVNode) {
      // The engine manages a container root and renders the VNode tree inside it.
      // Patch paths are calculated relative to the rendered VNode root, so we must
      // apply patches against the mounted child node rather than the container itself.
      const managedDomRoot = getManagedDomRoot(state.root);

      if (!managedDomRoot) {
        syncRoot(state.root, nextVNode);
        state.currentVNode = nextVNode;
        state.lastPatches = [];
        pushHistory(state.history, nextVNode);

        return {
          patches: [],
          previousVNode: state.history.entries[Math.max(0, state.history.currentIndex - 1)],
          currentVNode: state.currentVNode,
        };
      }

      const patches = diff(state.currentVNode, nextVNode, {
        mode: state.diffMode,
      });

      // [업데이트 7] diff는 old/new VNode를 비교해 patch 목록만 계산한다.
      // diff가 "무엇을 바꿀지"를 계산했다면,
      // applyPatches는 그 목록을 실제 DOM 조작으로 옮긴다.
      // [업데이트 8] applyPatches가 계산된 patch를 실제 DOM에 반영한다.
      applyPatches(managedDomRoot, patches);
      state.currentVNode = nextVNode;
      state.lastPatches = patches;
      state.totalPatchCount += countDisplayPatches(patches);
      state.rawTotalPatchCount += patches.length;
      pushHistory(state.history, nextVNode);

      return {
        patches,
        previousVNode: state.history.entries[Math.max(0, state.history.currentIndex - 1)],
        currentVNode: state.currentVNode,
      };
    },

    undo() {
      const result = undoHistory(state.history);

      if (result.moved) {
        syncRoot(state.root, result.currentVNode);
        state.currentVNode = result.currentVNode;
        state.lastPatches = [];
      }

      return result;
    },

    redo() {
      const result = redoHistory(state.history);

      if (result.moved) {
        syncRoot(state.root, result.currentVNode);
        state.currentVNode = result.currentVNode;
        state.lastPatches = [];
      }

      return result;
    },

    getCurrentVNode() {
      return state.currentVNode;
    },

    getHistory() {
      return state.history;
    },

    getDiffMode() {
      return state.diffMode;
    },

    setDiffMode(nextMode) {
      if (!isValidDiffMode(nextMode)) {
        throw new Error(`Unsupported diff mode: ${nextMode}`);
      }

      state.diffMode = nextMode;
      return state.diffMode;
    },

    inspect() {
      return inspectEngine(state);
    },
  };
}
