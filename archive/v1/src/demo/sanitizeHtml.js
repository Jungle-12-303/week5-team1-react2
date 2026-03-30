/*
 * Responsibility:
 * - 사용자 입력 HTML을 최소 정책으로 sanitize 한다.
 * - script 실행, on* 속성, javascript: URL을 제거한다.
 */

const BLOCKED_TAGS = new Set(["script", "iframe", "object", "embed"]);

function removeUnsafeAttributes(element) {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim().toLowerCase();

    if (name.startsWith("on")) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if ((name === "href" || name === "src" || name === "xlink:href") && value.startsWith("javascript:")) {
      element.removeAttribute(attribute.name);
    }
  }
}

function walkAndSanitize(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();

    if (BLOCKED_TAGS.has(tagName)) {
      node.remove();
      return;
    }

    removeUnsafeAttributes(node);
  }

  for (const child of Array.from(node.childNodes)) {
    walkAndSanitize(child);
  }
}

export function sanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  walkAndSanitize(template.content);
  return template.innerHTML;
}
