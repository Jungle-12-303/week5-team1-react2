/*
 * Responsibility:
 * - 외부 공개 facade인 engine 인스턴스를 생성한다.
 * - current vnode, history, diff mode, DOM 동기화를 하나의 객체로 묶는다.
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

      applyPatches(managedDomRoot, patches);
      state.currentVNode = nextVNode;
      state.lastPatches = patches;
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
