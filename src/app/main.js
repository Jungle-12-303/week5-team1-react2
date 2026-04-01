/*
 * Responsibility:
 * - Bootstraps the browser demo app.
 * - Wires the runtime inspector panel to the mounted app instance.
 */

import {createApp} from '../index.js';
import {App} from './App.js';

function createRuntimeBridge() {
  let snapshot = {
    reason: 'bootstrap',
    renderCount: 0,
    patchCount: 0,
    lastRenderPatchCount: 0,
    totalPatchCount: 0,
    rawLastRenderPatchCount: 0,
    rawTotalPatchCount: 0,
    patchLabels: [],
    diffMode: 'auto',
    isMounted: false,
  };
  const listeners = new Set();

  return {
    getSnapshot() {
      return snapshot;
    },

    publish(nextSnapshot) {
      snapshot = nextSnapshot;

      for (const listener of listeners) {
        listener(snapshot);
      }
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function renderInspectorPatchRows(root, patchLabels) {
  const list = root.querySelector('#runtime-inspector-patches');
  const inspector = root.querySelector('#runtime-inspector');
  const emptyLabel =
    inspector?.getAttribute('data-empty-patch-label') ||
    'No DOM patch was needed for the last render.';

  if (!list) {
    return;
  }

  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  if (!patchLabels || patchLabels.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'inspector-patch-row is-empty';
    emptyItem.textContent = emptyLabel;
    list.appendChild(emptyItem);
    return;
  }

  for (const label of patchLabels.slice(0, 6)) {
    const item = document.createElement('li');
    item.className = 'inspector-patch-row';
    item.textContent = label;
    list.appendChild(item);
  }
}

function syncRuntimeInspector(root, snapshot) {
  // syncRuntimeInspector는 "런타임 스냅샷 객체"를 실제 inspector DOM 텍스트로 옮기는 함수다.
  // 다시 말해 buildInspectorSnapshot()/runtimeBridge.publish()가 만든 데이터 모델을
  // 브라우저 오른쪽(또는 데스크톱) inspector 패널의 숫자/메타 정보/UI 리스트에 반영한다.
  const renderCount = root.querySelector(
    '#inspector-render-count .inspector-stat-value',
  );
  const lastPatchCount = root.querySelector(
    '#inspector-last-patch-count .inspector-stat-value',
  );
  const totalPatchCount = root.querySelector(
    '#inspector-total-patch-count .inspector-stat-value',
  );
  const meta = root.querySelector('#inspector-runtime-meta');

  if (renderCount) {
    // 최근까지 누적된 총 render 횟수를 숫자 UI에 반영한다.
    renderCount.textContent = String(snapshot.renderCount ?? 0);
  }

  if (lastPatchCount) {
    // 마지막 렌더에서 실제로 보이는 DOM patch가 몇 개 있었는지 표시한다.
    lastPatchCount.textContent = String(
      snapshot.lastRenderPatchCount ?? snapshot.patchCount ?? 0,
    );
  }

  if (totalPatchCount) {
    // 앱이 시작된 뒤 지금까지 누적된 총 patch 수를 반영한다.
    totalPatchCount.textContent = String(snapshot.totalPatchCount ?? 0);
  }

  if (meta) {
    // reason과 diffMode를 한 줄 메타 텍스트로 보여줘
    // "왜 이번 스냅샷이 갱신됐는지"와 "어떤 diff 전략을 쓰는지"를 빠르게 읽게 한다.
    meta.textContent = `Reason: ${snapshot.reason ?? 'bootstrap'} · Diff: ${snapshot.diffMode ?? 'auto'}`;
  }

  // patchLabels는 마지막 렌더가 어떤 patch들을 만들었는지 짧은 리스트로 보여준다.
  renderInspectorPatchRows(root, snapshot.patchLabels ?? []);
}

function buildInspectorSnapshot(app, runtimeBridge) {
  // buildInspectorSnapshot은 inspector 패널이 처음 뜰 때 보여줄 "현재 런타임 요약본"을 만든다.
  // 우선순위는 두 단계다.
  //
  // 1) runtimeBridge가 이미 publish 받은 최신 스냅샷이 있으면 그 값을 그대로 사용
  //    - mount/update 때 FunctionComponent.publishRuntimeSnapshot()이 여기를 밀어 넣는다.
  //    - 즉 renderCount, patchCount 같은 최신 수치를 가장 정확하게 얻을 수 있다.
  //
  // 2) 아직 bridge 쪽 수치가 비어 있다면 app.inspect() 결과를 바탕으로 fallback 스냅샷을 조립
  //    - 앱이 막 mount 된 직후처럼 bridge publish가 아직 없을 때를 대비한 안전장치다.
  //    - 이 덕분에 inspector는 "아직 publish 전" 상태에서도 빈 화면이 아니라 초기값을 보여줄 수 있다.
  const bridgeSnapshot = runtimeBridge.getSnapshot();

  if (
    bridgeSnapshot.renderCount > 0 ||
    bridgeSnapshot.lastRenderPatchCount > 0 ||
    bridgeSnapshot.totalPatchCount > 0 ||
    bridgeSnapshot.patchCount > 0
  ) {
    // 이미 bridge가 최신 수치를 들고 있으면 그것이 진실 소스(source of truth)다.
    return bridgeSnapshot;
  }

  // bridge가 아직 비어 있으면 app.inspect()를 직접 읽어 fallback 요약을 만든다.
  const inspection = app.inspect();
  const component = app.getComponent();

  return {
    // reason은 mount 전/후 구분을 위해 component.isMounted를 기준으로 채운다.
    reason: component.isMounted ? 'mount' : 'bootstrap',
    renderCount: inspection.renderCount ?? 0,
    // patch 관련 수치는 engine.inspect() 결과가 있으면 그 값을 우선 사용하고,
    // 없으면 현재 instance가 들고 있는 lastPatches/totalPatchCount로 대체한다.
    patchCount:
      inspection.engine?.lastRenderPatchCount ??
      inspection.lastPatches?.length ??
      0,
    lastRenderPatchCount:
      inspection.engine?.lastRenderPatchCount ??
      inspection.lastPatches?.length ??
      0,
    totalPatchCount:
      inspection.engine?.totalPatchCount ?? inspection.totalPatchCount ?? 0,
    rawLastRenderPatchCount:
      inspection.engine?.rawLastRenderPatchCount ??
      inspection.lastPatches?.length ??
      0,
    rawTotalPatchCount:
      inspection.engine?.rawTotalPatchCount ??
      inspection.rawTotalPatchCount ??
      0,
    // patchLabels는 최근 렌더에서 어떤 성격의 변경이 있었는지 요약한 문자열 목록이다.
    patchLabels: inspection.engine?.patchLabels ?? [],
    diffMode: component.diffMode ?? 'auto',
    isMounted: component.isMounted ?? false,
  };
}

function bindRuntimeInspector(root, runtimeBridge) {
  return runtimeBridge.subscribe((snapshot) => {
    syncRuntimeInspector(root, snapshot);
  });
}

function mountApp() {
  // [시작 1] 브라우저 DOM에서 문서 계약상 유일한 루트 컨테이너 #app을 찾는다.
  // 이후 모든 VDOM -> DOM 반영은 이 root 아래에서만 일어난다.
  const root = document.getElementById('app');

  if (!root) {
    throw new Error(
      'Expected "#app" root element for the card collection showcase app.',
    );
  }

  const runtimeBridge = createRuntimeBridge();
  bindRuntimeInspector(root, runtimeBridge);

  const app = createApp({
    root,
    component: App,
    props: {runtimeBridge},
    // [시작 2] batching 전략도 여기서 결정된다.
    // 현재는 microtask라서 같은 동기 구간의 여러 setState가 한 번의 update로 합쳐질 수 있다.
    batching: 'microtask',
  });

  // [시작 3] mount()가 실제 런타임 시작점이다.
  // 여기서 FunctionComponent.mount -> engine.render -> commitEffects가 이어진다.
  app.mount();
  syncRuntimeInspector(root, buildInspectorSnapshot(app, runtimeBridge));
}

if (
  document.readyState === 'interactive' ||
  document.readyState === 'complete'
) {
  mountApp();
} else {
  document.addEventListener('DOMContentLoaded', mountApp, {once: true});
}
