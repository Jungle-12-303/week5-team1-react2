/*
 * Responsibility:
 * - VNode events 객체를 실제 DOM 리스너로 연결/교체/제거한다.
 * - 동일 노드에 리스너가 중복 등록되지 않도록 내부 저장소를 유지한다.
 *
 * Easy explanation:
 * - 이전 렌더의 onClick과 새 렌더의 onClick이 다르면, DOM 리스너도 바꿔야 한다.
 * - 이 파일은 그 교체/제거 작업을 안전하게 처리한다.
 */

import { LISTENER_STORE } from "../shared/constants.js";

function ensureListenerStore(element) {
  if (!element[LISTENER_STORE]) {
    element[LISTENER_STORE] = {};
  }

  return element[LISTENER_STORE];
}

export function setEvent(element, eventName, handler) {
  const listeners = ensureListenerStore(element);
  const previousHandler = listeners[eventName];

  if (previousHandler) {
    // 같은 이벤트 이름에 새 핸들러가 오면 이전 리스너를 먼저 제거한다.
    element.removeEventListener(eventName, previousHandler);
  }

  if (handler) {
    element.addEventListener(eventName, handler);
    listeners[eventName] = handler;
    return;
  }

  delete listeners[eventName];
}

export function removeEvent(element, eventName) {
  const listeners = ensureListenerStore(element);
  const previousHandler = listeners[eventName];

  if (!previousHandler) {
    return;
  }

  element.removeEventListener(eventName, previousHandler);
  delete listeners[eventName];
}

/**
 * 목적:
 * - VNode events 전체를 DOM에 동기화한다.
 */
export function applyEvents(element, events = {}) {
  const listeners = ensureListenerStore(element);

  for (const eventName of Object.keys(listeners)) {
    // 새 VNode에 없는 이벤트는 DOM에서도 제거한다.
    if (!Object.prototype.hasOwnProperty.call(events, eventName)) {
      removeEvent(element, eventName);
    }
  }

  for (const [eventName, handler] of Object.entries(events)) {
    // 새 VNode에 있는 이벤트는 add/remove를 거쳐 현재 DOM 상태와 동기화한다.
    setEvent(element, eventName, handler);
  }

  return element;
}
