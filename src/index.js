/*
 * Responsibility:
 * - 문서에서 정의한 라이브러리 공개 엔트리포인트를 제공한다.
 * - core 내부 구현 파일 경로를 외부 사용자에게 직접 노출하지 않도록 export를 모은다.
 *
 * Detailed logic:
 * - createEngine()은 facade API이므로 최상위에서 바로 노출한다.
 * - h(), domToVNode(), diff(), applyPatches(), createHistory()는 문서에 정의된
 *   low-level API 집합이므로 함께 re-export 한다.
 */

export { createEngine } from "./core/engine/createEngine.js";
export { h } from "./core/vnode/h.js";
export { domToVNode } from "./core/renderer-dom/domToVNode.js";
export { diff } from "./core/reconciler/diff.js";
export { applyPatches } from "./core/renderer-dom/patch.js";
export { createHistory } from "./core/history/createHistory.js";
