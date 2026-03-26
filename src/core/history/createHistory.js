/*
 * Responsibility:
 * - History 기본 shape를 생성한다.
 */

/**
 * 목적:
 * - 초기 VNode 하나를 포함하는 history 객체를 만든다.
 */
export function createHistory(initialVNode, options = {}) {
  return {
    entries: [initialVNode],
    currentIndex: 0,
    maxLength: options.maxLength ?? null,
  };
}
