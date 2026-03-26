/*
 * Responsibility:
 * - VNode events 객체를 실제 DOM 리스너로 연결/교체/제거한다.
 * - 동일 노드에 리스너가 중복 등록되지 않도록 내부 저장소를 유지한다.
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
    if (!Object.prototype.hasOwnProperty.call(events, eventName)) {
      removeEvent(element, eventName);
    }
  }

  for (const [eventName, handler] of Object.entries(events)) {
    setEvent(element, eventName, handler);
  }

  return element;
}
