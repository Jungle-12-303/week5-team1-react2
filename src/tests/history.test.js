/*
 * Responsibility:
 * - history push / undo / redo / redo 절단 동작을 검증한다.
 */

import { h } from "../core/vnode/h.js";
import { createHistory } from "../core/history/createHistory.js";
import { pushHistory, redoHistory, undoHistory } from "../core/history/historyApi.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export function runHistoryTests() {
  return [
    runCase("push snapshot", () => {
      const history = createHistory(h("div", null, "A"));
      pushHistory(history, h("div", null, "B"));

      if (history.entries.length !== 2) {
        throw new Error("Expected history to grow.");
      }
    }),
    runCase("undo and redo", () => {
      const history = createHistory(h("div", null, "A"));
      pushHistory(history, h("div", null, "B"));
      const undo = undoHistory(history);
      const redo = redoHistory(history);

      if (!undo.moved || !redo.moved) {
        throw new Error("Expected undo and redo to move.");
      }
    }),
    runCase("truncate redo branch after new push", () => {
      const history = createHistory(h("div", null, "A"));
      pushHistory(history, h("div", null, "B"));
      pushHistory(history, h("div", null, "C"));
      undoHistory(history);
      pushHistory(history, h("div", null, "D"));

      if (history.entries.length !== 3 || history.entries[2].children[0].text !== "D") {
        throw new Error("Expected redo branch to be truncated before pushing new snapshot.");
      }
    }),
    runCase("respect history boundary on first undo", () => {
      const history = createHistory(h("div", null, "A"));
      const result = undoHistory(history);

      if (result.moved) {
        throw new Error("Expected undo to stay at the first history entry.");
      }
    }),
  ];
}
