/*
 * Responsibility:
 * - Core 전역에서 공유하는 상수 집합을 정의한다.
 * - VNode 타입, diff 모드, patch 타입, 예약 prop 정책을 한곳에서 관리한다.
 *
 * Inputs/Outputs:
 * - 입력 없음
 * - 여러 모듈이 import 해서 사용하는 immutable 상수 export
 *
 * Relationships:
 * - vnode, reconciler, renderer-dom, engine 계층이 공통 참조한다.
 *
 * Extension points:
 * - component, scheduler, renderer 확장 시 새로운 flags/constants를 추가할 수 있다.
 */

export const NODE_TYPES = Object.freeze({
  ELEMENT: "element",
  TEXT: "text",
});

export const DIFF_MODES = Object.freeze({
  AUTO: "auto",
  INDEX: "index",
  KEYED: "keyed",
});

export const PATCH_TYPES = Object.freeze({
  SET_PROP: "SET_PROP",
  REMOVE_PROP: "REMOVE_PROP",
  SET_TEXT: "SET_TEXT",
  INSERT_CHILD: "INSERT_CHILD",
  REMOVE_CHILD: "REMOVE_CHILD",
  MOVE_CHILD: "MOVE_CHILD",
  REPLACE_NODE: "REPLACE_NODE",
  SET_EVENT: "SET_EVENT",
  REMOVE_EVENT: "REMOVE_EVENT",
});

export const EVENT_PREFIX = "on";

export const RESERVED_PROPS = Object.freeze({
  KEY: "key",
});

export const BOOLEAN_PROPS = Object.freeze(
  new Set(["checked", "disabled", "selected", "readonly", "multiple", "hidden"])
);

export const LISTENER_STORE = Symbol("virtualDomEngineListeners");
