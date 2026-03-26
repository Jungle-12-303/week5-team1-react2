/*
 * Responsibility:
 * - demo와 디버깅용 inspect 데이터를 만든다.
 */

export function inspectEngine(engineState) {
  return {
    currentVNode: engineState.currentVNode,
    history: engineState.history,
    diffMode: engineState.diffMode,
    patchCount: engineState.lastPatches.length,
    lastPatches: engineState.lastPatches,
  };
}
