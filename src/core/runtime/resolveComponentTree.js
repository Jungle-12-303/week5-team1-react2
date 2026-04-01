/*
 * Responsibility:
 * - 자식 함수형 컴포넌트를 일반 VNode 트리로 전개한다.
 *
 * Easy explanation:
 * - h(Card, props) 같은 함수형 자식은 브라우저가 바로 이해할 수 없다.
 * - 그래서 Card(props)를 실제로 호출해서 div, span, text 같은 일반 VNode로 풀어내야 한다.
 * - 이 파일은 그 "함수 컴포넌트 해석기"다.
 */

import { createTextVNode } from "../vnode/index.js";
import { normalizeChildren } from "../vnode/normalizeChildren.js";
import { isArray, isFunction } from "../shared/utils.js";
import { runWithHooksDisabled } from "./currentDispatcher.js";

function normalizeResolvedValue(value) {
  // 1) 함수 컴포넌트의 반환값은 null, boolean, string, number, vnode 등 여러 형태일 수 있다.
  // 2) diff / renderer는 결국 "정규화된 단일 VNode"를 기대하므로 여기서 모양을 맞춘다.
  // 3) 특히 null/boolean은 렌더 결과가 없다는 뜻이지만, 이 프로젝트는 후속 단계 단순화를 위해
  //    완전히 비워두지 않고 빈 text vnode로 바꿔 안전하게 처리한다.
  if (value === null || value === undefined || value === false || value === true) {
    return createTextVNode("");
  }

  // 문자열/숫자도 직접 DOM이 될 수 없으므로 text vnode로 감싼다.
  if (typeof value === "string" || typeof value === "number") {
    return createTextVNode(value);
  }

  // 자식 함수 컴포넌트는 반드시 "하나의 루트 VNode"를 반환해야 한다.
  // 배열을 허용하면 현재 런타임의 component resolver / diff 단순 모델이 깨지므로 에러 처리한다.
  if (isArray(value)) {
    throw new Error("Child components must return a single VNode.");
  }

  // 여기까지 왔다는 것은 이미 VNode처럼 취급 가능한 값이라는 뜻이다.
  return value;
}

function resolveChildren(children = []) {
  // 일반 DOM 태그의 children도 안쪽에 함수형 컴포넌트를 품고 있을 수 있다.
  // 따라서 children 배열을 정규화한 뒤, 각 child에 대해 resolveComponentTree를 재귀 적용한다.
  return normalizeChildren(children).map((child) => resolveComponentTree(child));
}

export function resolveComponentTree(inputVNode) {
  // [전개 1] 입력값을 먼저 "안전한 단일 VNode"로 정규화한다.
  // 여기서 text/empty 반환값도 모두 이후 단계가 이해 가능한 형태가 된다.
  const vnode = normalizeResolvedValue(inputVNode);

  // [전개 2] text vnode는 더 내려갈 자식이나 실행할 함수 컴포넌트가 없으므로 그대로 종료한다.
  if (vnode.type === "text") {
    return vnode;
  }

  if (!isFunction(vnode.tag)) {
    // [전개 3] tag가 함수가 아니면 div, span 같은 "일반 DOM 태그 vnode"다.
    // 이 경우 이 노드 자체를 다시 만들 필요는 없고,
    // 안쪽 children 안에 남아 있을 수 있는 함수형 컴포넌트만 재귀적으로 풀어주면 된다.
    //
    // 예:
    // h("section", null, h(CardTile, props))
    // -> section vnode는 유지
    // -> children 안의 CardTile만 아래 resolveChildren에서 전개
    return {
      ...vnode,
      children: resolveChildren(vnode.children),
    };
  }

  // [전개 4] 여기부터는 h(CardTile, props)처럼 "함수형 컴포넌트 vnode"를 만난 경우다.
  // vnode.props만 넘기면 children 정보가 빠질 수 있으므로, React처럼 children도 props에 합쳐서 전달한다.
  const nextProps = {
    ...(vnode.props ?? {}),
    children: vnode.children ?? [],
  };

  // [전개 5] 함수 컴포넌트를 "지금 이 자리에서" 즉시 실행한다.
  // 즉, h(CardTile, props)라는 추상 노드를 CardTile(nextProps) 호출로 바꾸고,
  // 그 반환값을 다시 실제 VNode 후보로 받는다.
  //
  // 중요한 점:
  // - 이 프로젝트에서 자식 함수 컴포넌트는 독립 Hook 저장소를 갖지 않는다.
  // - 그래서 resolver 단계에서는 Hooks를 강제로 끄고 실행한다.
  // - 즉 자식은 사실상 "props -> vnode"를 반환하는 stateless renderer처럼 동작한다.
  const resolved = runWithHooksDisabled(() => vnode.tag(nextProps));

  // [전개 6] 방금 자식 함수가 반환한 값 안에도 또 다른 함수형 컴포넌트가 중첩돼 있을 수 있다.
  // 따라서 한 번 실행하고 끝내지 않고, 반환 결과를 다시 resolveComponentTree에 넣어 재귀적으로 끝까지 푼다.
  const resolvedTree = resolveComponentTree(resolved);

  // [전개 7] 함수 컴포넌트 wrapper에 key가 있었는데, 자식이 반환한 실제 루트 vnode에 key가 없다면
  // 원래 wrapper의 key를 최종 트리에 복원해 child diff의 identity가 유지되게 한다.
  //
  // 예:
  // h(CardTile, { key: card.id, ... })
  // CardTile(props) -> h("article", ...)
  // 이때 article vnode가 key를 직접 모르더라도 wrapper의 key를 넘겨줘야 keyed diff가 가능하다.
  if ((resolvedTree.key === null || resolvedTree.key === undefined) && vnode.key !== null && vnode.key !== undefined) {
    return {
      ...resolvedTree,
      key: vnode.key,
    };
  }

  // [전개 8] 최종적으로 "함수형 컴포넌트가 모두 사라진 순수 VNode 트리"를 반환한다.
  // 이후 diff는 이 resolvedTree와 이전 currentVNode를 비교하게 된다.
  return resolvedTree;
}
