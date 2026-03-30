/*
 * Responsibility:
 * - 루트 함수형 컴포넌트의 mount/update/unmount와 Hook 런타임을 관리한다.
 */

import { createEngine } from "../engine/createEngine.js";
import { setCurrentComponent, clearCurrentComponent } from "./currentDispatcher.js";
import { resolveComponentTree } from "./resolveComponentTree.js";
import { commitEffects } from "./commitEffects.js";
import { unmountComponent } from "./unmountComponent.js";

function ensureRootElement(root) {
  if (!(root instanceof Element)) {
    throw new Error("FunctionComponent.mount requires a valid root Element.");
  }
}

function normalizeProps(props) {
  return props ?? {};
}

export class FunctionComponent {
  constructor(renderFn, options = {}) {
    if (typeof renderFn !== "function") {
      throw new Error("FunctionComponent requires a render function.");
    }

    this.renderFn = renderFn;
    this.name = options.name ?? renderFn.name ?? "FunctionComponent";
    this.batching = options.batching ?? "sync";
    this.diffMode = options.diffMode ?? "auto";
    this.historyLimit = options.historyLimit ?? null;

    this.hooks = [];
    this.hookCursor = 0;
    this.currentProps = {};
    this.currentVNode = null;
    this.rootElement = null;
    this.isMounted = false;
    this.pendingEffects = [];
    this.renderCount = 0;
    this.lastPatches = [];
    this.scheduledUpdate = null;
    this.engine = null;
    this.hasMountedOnce = false;
    this.expectedHookCount = null;
  }

  performRender(props = this.currentProps) {
    this.currentProps = normalizeProps(props);
    this.hookCursor = 0;
    this.pendingEffects = [];
    this.renderCount += 1;

    setCurrentComponent(this, { allowHooks: true });

    try {
      const unresolvedVNode = this.renderFn(this.currentProps);
      const resolvedVNode = resolveComponentTree(unresolvedVNode);

      if (this.expectedHookCount === null) {
        this.expectedHookCount = this.hookCursor;
      } else if (this.hookCursor !== this.expectedHookCount) {
        throw new Error("Hook count changed between renders.");
      }

      return resolvedVNode;
    } finally {
      clearCurrentComponent();
    }
  }

  mount({ root, props } = {}) {
    ensureRootElement(root);

    if (this.isMounted) {
      return this.currentVNode;
    }

    if (this.hasMountedOnce) {
      throw new Error("FunctionComponent instances cannot be mounted again after unmount.");
    }

    this.rootElement = root;
    const nextVNode = this.performRender(props);

    this.engine = createEngine({
      root,
      initialVNode: nextVNode,
      diffMode: this.diffMode,
      historyLimit: this.historyLimit,
    });

    this.engine.render(nextVNode);
    this.currentVNode = nextVNode;
    this.lastPatches = [];
    this.isMounted = true;
    this.hasMountedOnce = true;

    commitEffects(this);

    return nextVNode;
  }

  update(nextProps) {
    if (!this.isMounted || !this.engine) {
      throw new Error("FunctionComponent.update requires a mounted component.");
    }

    if (arguments.length > 0) {
      this.currentProps = normalizeProps(nextProps);
    }

    const nextVNode = this.performRender(this.currentProps);
    const result = this.engine.patch(nextVNode);

    this.currentVNode = nextVNode;
    this.lastPatches = result.patches;

    commitEffects(this);

    return {
      vnode: nextVNode,
      patches: result.patches,
    };
  }

  unmount() {
    if (!this.isMounted) {
      return;
    }

    unmountComponent(this);
  }
}
