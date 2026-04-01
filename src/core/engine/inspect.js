/*
 * Responsibility:
 * - demo와 디버깅용 inspect 데이터를 만든다.
 */

function describePatch(patch) {
  if (!patch || typeof patch !== "object") {
    return "UNKNOWN_PATCH";
  }

  if (patch.type === "SET_PROP" || patch.type === "REMOVE_PROP") {
    return `${patch.type}: ${patch.name}`;
  }

  if (patch.type === "SET_EVENT" || patch.type === "REMOVE_EVENT") {
    return `${patch.type}: ${patch.name}`;
  }

  return patch.type;
}

export function inspectEngine(engineState) {
  const lastPatches = engineState.lastPatches ?? [];
  const lastRenderPatchCount = lastPatches.length;

  return {
    currentVNode: engineState.currentVNode,
    history: engineState.history,
    diffMode: engineState.diffMode,
    patchCount: lastRenderPatchCount,
    lastRenderPatchCount,
    totalPatchCount: engineState.totalPatchCount ?? lastRenderPatchCount,
    patchLabels: lastPatches.map(describePatch),
    lastPatches,
  };
}
