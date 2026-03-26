/*
 * Responsibility:
 * - history push / undo / redo와 관련된 순수 연산을 제공한다.
 *
 * Relationships:
 * - engine이 상태 이력 관리 로직을 위임한다.
 */

function trimHistory(history) {
  if (!history.maxLength || history.entries.length <= history.maxLength) {
    return history;
  }

  const overflow = history.entries.length - history.maxLength;
  history.entries.splice(0, overflow);
  history.currentIndex = Math.max(0, history.currentIndex - overflow);
  return history;
}

export function canUndo(history) {
  return history.currentIndex > 0;
}

export function canRedo(history) {
  return history.currentIndex < history.entries.length - 1;
}

/**
 * 목적:
 * - 새 snapshot을 history 끝에 추가한다.
 *
 * 상세 로직:
 * - currentIndex 뒤의 redo 구간을 먼저 잘라낸다.
 * - 새 snapshot을 push 한 뒤 currentIndex를 마지막으로 이동한다.
 */
export function pushHistory(history, nextVNode) {
  history.entries = history.entries.slice(0, history.currentIndex + 1);
  history.entries.push(nextVNode);
  history.currentIndex = history.entries.length - 1;
  return trimHistory(history);
}

export function undoHistory(history) {
  if (!canUndo(history)) {
    return {
      moved: false,
      currentVNode: history.entries[history.currentIndex],
    };
  }

  history.currentIndex -= 1;
  return {
    moved: true,
    currentVNode: history.entries[history.currentIndex],
  };
}

export function redoHistory(history) {
  if (!canRedo(history)) {
    return {
      moved: false,
      currentVNode: history.entries[history.currentIndex],
    };
  }

  history.currentIndex += 1;
  return {
    moved: true,
    currentVNode: history.entries[history.currentIndex],
  };
}
