/*
 * Responsibility:
 * - 같은 element 노드라고 판단된 두 VNode의 props 차이를 patch로 계산한다.
 *
 * Relationships:
 * - diff.js가 props 비교를 세부 위임할 때 사용한다.
 */

import { PATCH_TYPES } from "./patchTypes.js";

/**
 * 목적:
 * - old/new props 차이를 flat patch list로 변환한다.
 *
 * 상세 로직:
 * - old에만 있으면 REMOVE_PROP
 * - new에만 있거나 값이 바뀌면 SET_PROP
 */
export function diffProps(oldProps = {}, newProps = {}, path = []) {
  const patches = [];
  const allPropNames = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const name of allPropNames) {
    const hasOld = Object.prototype.hasOwnProperty.call(oldProps, name);
    const hasNew = Object.prototype.hasOwnProperty.call(newProps, name);

    if (!hasNew && hasOld) {
      patches.push({
        type: PATCH_TYPES.REMOVE_PROP,
        path,
        name,
      });
      continue;
    }

    if (!hasOld && hasNew) {
      patches.push({
        type: PATCH_TYPES.SET_PROP,
        path,
        name,
        value: newProps[name],
      });
      continue;
    }

    if (oldProps[name] !== newProps[name]) {
      patches.push({
        type: PATCH_TYPES.SET_PROP,
        path,
        name,
        value: newProps[name],
      });
    }
  }

  return patches;
}
