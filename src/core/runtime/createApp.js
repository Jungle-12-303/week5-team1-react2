/*
 * Responsibility:
 * - v3 공개 진입점 createApp()을 제공한다.
 *
 * Easy explanation:
 * - FunctionComponent는 내부 구현 클래스다.
 * - createApp()은 사용자가 이 내부 클래스를 직접 다루지 않아도 되도록 만든 편의 함수다.
 * - 루트 DOM과 App 함수만 넘기면 mount/updateProps/unmount를 바로 쓸 수 있게 해준다.
 */

import { FunctionComponent } from "./FunctionComponent.js";

function normalizeRoot(root) {
  if (!(root instanceof Element)) {
    throw new Error("createApp requires a valid root Element.");
  }

  return root;
}

function normalizeBatching(batching) {
  return batching ?? "sync";
}

export function createApp(options = {}) {
  // 문서에 정의된 공개 옵션을 정규화하고 내부 런타임 인스턴스를 만든다.
  const root = normalizeRoot(options.root);
  const component = options.component;

  if (typeof component !== "function") {
    throw new Error("createApp requires a root component function.");
  }

  const initialProps = options.props ?? {};
  const instance = new FunctionComponent(component, {
    name: component.name ?? "App",
    batching: normalizeBatching(options.batching),
    diffMode: options.diffMode ?? "auto",
    historyLimit: options.historyLimit ?? null,
    runtimeBridge: initialProps.runtimeBridge ?? null,
  });

  return {
    mount() {
      // 최초 렌더를 시작한다.
      return instance.mount({ root, props: initialProps });
    },

    unmount() {
      return instance.unmount();
    },

    updateProps(nextProps) {
      if (!instance.isMounted) {
        throw new Error("updateProps requires the app to be mounted first.");
      }

      // 외부에서 받은 props 객체를 교체하고 루트 update를 수행한다.
      return instance.update(nextProps ?? {});
    },

    getComponent() {
      return instance;
    },

    inspect() {
      // inspect는 발표와 디버깅에 도움이 되는 상태 스냅샷이다.
      const engineSnapshot = instance.engine?.inspect?.() ?? {
        currentVNode: instance.currentVNode,
        lastPatches: instance.lastPatches,
      };

      return {
        hooks: instance.hooks,
        currentVNode: instance.currentVNode,
        lastPatches: instance.lastPatches,
        renderCount: instance.renderCount,
        totalPatchCount: instance.totalPatchCount,
        engine: engineSnapshot,
      };
    },
  };
}
