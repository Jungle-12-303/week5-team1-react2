/*
 * Responsibility:
 * - Node 환경에서 DOM 의존 테스트를 실행할 수 있는 최소 테스트 DOM을 제공한다.
 */

function createAttributeArray(attributeMap) {
  return Object.entries(attributeMap).map(([name, value]) => ({
    name,
    value,
  }));
}

class TestNode {
  constructor(nodeType, ownerDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get textContent() {
    if (this.nodeType === TestNode.TEXT_NODE) {
      return this.data;
    }

    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    if (this.nodeType === TestNode.TEXT_NODE) {
      this.data = String(value ?? "");
      return;
    }

    this.childNodes = [];

    if (value !== null && value !== undefined && value !== "") {
      const textNode = this.ownerDocument.createTextNode(String(value));
      this.appendChild(textNode);
    }
  }

  appendChild(child) {
    return this.insertBefore(child, null);
  }

  insertBefore(child, nextSibling) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;

    if (nextSibling === null || nextSibling === undefined) {
      this.childNodes.push(child);
      return child;
    }

    const nextIndex = this.childNodes.indexOf(nextSibling);

    if (nextIndex === -1) {
      throw new Error("Cannot insert before a node that is not a child.");
    }

    this.childNodes.splice(nextIndex, 0, child);
    return child;
  }

  removeChild(child) {
    const childIndex = this.childNodes.indexOf(child);

    if (childIndex === -1) {
      throw new Error("Cannot remove a node that is not a child.");
    }

    this.childNodes.splice(childIndex, 1);
    child.parentNode = null;
    return child;
  }

  replaceWith(replacement) {
    if (!this.parentNode) {
      return;
    }

    const parent = this.parentNode;
    const currentIndex = parent.childNodes.indexOf(this);
    parent.removeChild(this);

    if (currentIndex >= parent.childNodes.length) {
      parent.appendChild(replacement);
      return;
    }

    parent.insertBefore(replacement, parent.childNodes[currentIndex]);
  }
}

TestNode.ELEMENT_NODE = 1;
TestNode.TEXT_NODE = 3;

class TestTextNode extends TestNode {
  constructor(text, ownerDocument) {
    super(TestNode.TEXT_NODE, ownerDocument);
    this.data = String(text ?? "");
  }
}

class TestElement extends TestNode {
  constructor(tagName, ownerDocument) {
    super(TestNode.ELEMENT_NODE, ownerDocument);
    this.tagName = String(tagName).toUpperCase();
    this._attributes = {};
    this._listeners = {};
    this.className = "";
    this.value = "";
    this.checked = false;
    this.selected = false;
    this.disabled = false;
    this.multiple = false;
    this.hidden = false;
    this.readOnly = false;
  }

  get attributes() {
    return createAttributeArray(this._attributes);
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  setAttribute(name, value) {
    const normalizedName = String(name);
    const stringValue = String(value);
    this._attributes[normalizedName] = stringValue;

    if (normalizedName === "class") {
      this.className = stringValue;
    }

    if (normalizedName === "className") {
      this.className = stringValue;
      this._attributes.class = stringValue;
    }

    if (normalizedName === "value") {
      this.value = stringValue;
    }

    if (normalizedName === "checked") {
      this.checked = true;
    }
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this._attributes, name)
      ? this._attributes[name]
      : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this._attributes, name);
  }

  removeAttribute(name) {
    delete this._attributes[name];

    if (name === "class" || name === "className") {
      this.className = "";
    }

    if (name === "checked") {
      this.checked = false;
    }
  }

  addEventListener(eventName, handler) {
    if (!this._listeners[eventName]) {
      this._listeners[eventName] = new Set();
    }

    this._listeners[eventName].add(handler);
  }

  removeEventListener(eventName, handler) {
    this._listeners[eventName]?.delete(handler);
  }

  dispatchEvent(event) {
    if (!event.target) {
      event.target = this;
    }

    event.currentTarget = this;

    const handlers = Array.from(this._listeners[event.type] ?? []);

    for (const handler of handlers) {
      handler.call(this, event);
    }

    if (event.bubbles && !event.cancelBubble && this.parentNode) {
      return this.parentNode.dispatchEvent(event);
    }

    return true;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const matcher = createSelectorMatcher(selector);
    const result = [];

    walkDescendants(this, (node) => {
      if (node instanceof TestElement && matcher(node)) {
        result.push(node);
      }
    });

    return result;
  }
}

class TestDocument {
  constructor() {
    this.readyState = "complete";
    this.documentElement = new TestElement("html", this);
    this.body = new TestElement("body", this);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName) {
    return new TestElement(tagName, this);
  }

  createTextNode(text) {
    return new TestTextNode(text, this);
  }

  getElementById(id) {
    return this.body.querySelector(`#${id}`);
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

class TestEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.cancelBubble = false;
    this.target = null;
    this.currentTarget = null;
  }

  stopPropagation() {
    this.cancelBubble = true;
  }
}

function walkDescendants(root, visit) {
  for (const child of root.childNodes) {
    visit(child);
    walkDescendants(child, visit);
  }
}

function createSelectorMatcher(selector) {
  if (selector.startsWith("#")) {
    const expectedId = selector.slice(1);
    return (node) => node.id === expectedId;
  }

  const expectedTag = selector.toUpperCase();
  return (node) => node.tagName === expectedTag;
}

export function installTestDomEnvironment() {
  if (typeof globalThis.document !== "undefined" && typeof globalThis.Element !== "undefined") {
    return;
  }

  const documentRef = new TestDocument();
  globalThis.Node = TestNode;
  globalThis.Element = TestElement;
  globalThis.Event = TestEvent;
  globalThis.document = documentRef;
}
