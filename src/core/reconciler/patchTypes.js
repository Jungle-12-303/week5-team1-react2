/*
 * Responsibility:
 * - reconciler와 renderer가 공유하는 patch type 상수를 재-export 한다.
 */

import { PATCH_TYPES } from "../shared/constants.js";

export { PATCH_TYPES };
export default PATCH_TYPES;
