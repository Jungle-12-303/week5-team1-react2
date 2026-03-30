/*
 * Responsibility:
 * - week5 v3 runtime의 핵심 동작을 통합 수준에서 검증한다.
 */

import { createApp, h, useEffect, useMemo, useState } from "../index.js";

function runCase(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

async function runAsyncCase(name, fn) {
  try {
    await fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

export async function runRuntimeTests() {
  if (typeof document === "undefined") {
    return [{ name: "runtime tests", passed: true, skipped: true }];
  }

  const cases = [
    runCase("createApp mounts root state and stateless child components", () => {
      const root = document.createElement("div");
      let setCount = null;

      function CounterLabel(props) {
        return h("strong", null, props.label);
      }

      function App() {
        const [count, updateCount] = useState(0);
        setCount = updateCount;

        const doubled = useMemo(() => count * 2, [count]);

        return h("section", null,
          h(CounterLabel, { label: `count:${count}` }),
          h("span", null, ` doubled:${doubled}`)
        );
      }

      const app = createApp({ root, component: App });
      app.mount();

      if (root.textContent !== "count:0 doubled:0") {
        throw new Error("Expected initial mount output to match the root state.");
      }

      setCount(2);

      if (root.textContent !== "count:2 doubled:4") {
        throw new Error("Expected state updates to re-render the resolved child tree.");
      }
    }),
    runCase("updateProps replaces external props instead of merging them", () => {
      const root = document.createElement("div");

      function App(props) {
        return h("div", null, `${props.first ?? "missing"}|${props.second ?? "missing"}`);
      }

      const app = createApp({
        root,
        component: App,
        props: { first: "A", second: "B" },
      });

      app.mount();
      app.updateProps({ second: "C" });

      if (root.textContent !== "missing|C") {
        throw new Error("Expected updateProps to replace the props object.");
      }
    }),
    runCase("useEffect cleanup runs on update and unmount, setters become no-op after unmount", () => {
      const root = document.createElement("div");
      const lifecycle = [];
      let setValue = null;

      function App() {
        const [value, updateValue] = useState("A");
        setValue = updateValue;

        useEffect(() => {
          lifecycle.push(`effect:${value}`);
          return () => {
            lifecycle.push(`cleanup:${value}`);
          };
        }, [value]);

        return h("div", null, value);
      }

      const app = createApp({ root, component: App });
      app.mount();
      setValue("B");
      app.unmount();
      setValue("C");

      const joined = lifecycle.join(",");

      if (joined !== "effect:A,cleanup:A,effect:B,cleanup:B") {
        throw new Error(`Unexpected effect lifecycle: ${joined}`);
      }

      if (root.childNodes.length !== 0) {
        throw new Error("Expected unmount to clear the root DOM.");
      }
    }),
    runCase("form controls keep DOM properties and event-driven state in sync", () => {
      const root = document.createElement("div");

      function App() {
        const [text, setText] = useState("hello");
        const [done, setDone] = useState(false);

        return h("form", null,
          h("input", {
            value: text,
            onInput: (event) => setText(event.target.value),
          }),
          h("input", {
            type: "checkbox",
            checked: done,
            onChange: (event) => setDone(event.target.checked),
          }),
          h("p", null, `${text}|${done ? "done" : "pending"}`)
        );
      }

      createApp({ root, component: App }).mount();

      const [textInput, checkboxInput] = root.querySelectorAll("input");
      const summary = root.querySelector("p");

      if (textInput.value !== "hello") {
        throw new Error("Expected the text input value to reflect state.");
      }

      if (checkboxInput.checked !== false) {
        throw new Error("Expected the checkbox checked state to reflect state.");
      }

      textInput.value = "world";
      textInput.dispatchEvent(new Event("input", { bubbles: true }));
      checkboxInput.checked = true;
      checkboxInput.dispatchEvent(new Event("change", { bubbles: true }));

      if (summary.textContent !== "world|done") {
        throw new Error("Expected form events to update root state.");
      }
    }),
    runCase("textarea and select keep value semantics in sync", () => {
      const root = document.createElement("div");

      function App() {
        const [note, setNote] = useState("memo");
        const [sort, setSort] = useState("name");

        return h("section", null,
          h("textarea", {
            value: note,
            onInput: (event) => setNote(event.target.value),
          }),
          h("select", {
            value: sort,
            onChange: (event) => setSort(event.target.value),
          },
            h("option", { value: "name" }, "Name"),
            h("option", { value: "date" }, "Date")
          ),
          h("p", null, `${note}|${sort}`)
        );
      }

      createApp({ root, component: App }).mount();

      const textarea = root.querySelector("textarea");
      const select = root.querySelector("select");
      const summary = root.querySelector("p");

      if (textarea.value !== "memo" || select.value !== "name") {
        throw new Error("Expected textarea/select initial values to reflect state.");
      }

      textarea.value = "updated";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      select.value = "date";
      select.dispatchEvent(new Event("change", { bubbles: true }));

      if (summary.textContent !== "updated|date") {
        throw new Error("Expected textarea/select events to update state.");
      }
    }),
    runCase("child components cannot use hooks", () => {
      const root = document.createElement("div");

      function InvalidChild() {
        useState(0);
        return h("div", null, "invalid");
      }

      function App() {
        return h(InvalidChild, null);
      }

      let errorMessage = "";

      try {
        createApp({ root, component: App }).mount();
      } catch (error) {
        errorMessage = error.message;
      }

      if (!errorMessage.includes("Hooks are only supported in the root component render")) {
        throw new Error("Expected child hook usage to throw a root-only hook error.");
      }
    }),
    runCase("hook count changes between renders throw an explicit error", () => {
      const root = document.createElement("div");

      function App(props) {
        useState(0);

        if (props.extra) {
          useMemo(() => 1, []);
        }

        return h("div", null, "ok");
      }

      const app = createApp({
        root,
        component: App,
        props: { extra: false },
      });

      app.mount();

      let errorMessage = "";

      try {
        app.updateProps({ extra: true });
      } catch (error) {
        errorMessage = error.message;
      }

      if (!errorMessage.includes("Hook count changed between renders")) {
        throw new Error("Expected hook count drift to throw an explicit error.");
      }
    }),
    runCase("useEffect without deps runs on every update and empty deps run once", () => {
      const root = document.createElement("div");
      const lifecycle = [];
      let setCount = null;

      function App() {
        const [count, updateCount] = useState(0);
        setCount = updateCount;

        useEffect(() => {
          lifecycle.push(`always:${count}`);
        });

        useEffect(() => {
          lifecycle.push(`once:${count}`);
        }, []);

        return h("div", null, String(count));
      }

      createApp({ root, component: App }).mount();
      setCount(1);
      setCount(2);

      const joined = lifecycle.join(",");

      if (joined !== "always:0,once:0,always:1,always:2") {
        throw new Error(`Unexpected effect dependency behavior: ${joined}`);
      }
    }),
  ];

  cases.push(
    await runAsyncCase("microtask batching coalesces multiple state updates", async () => {
      const root = document.createElement("div");
      let setCount = null;
      let renderCount = 0;

      function App() {
        renderCount += 1;
        const [count, updateCount] = useState(0);
        setCount = updateCount;
        return h("div", null, String(count));
      }

      const app = createApp({
        root,
        component: App,
        batching: "microtask",
      });

      app.mount();
      setCount(1);
      setCount(2);
      await Promise.resolve();

      if (root.textContent !== "2") {
        throw new Error("Expected the microtask batch to flush the latest state.");
      }

      if (renderCount !== 2) {
        throw new Error(`Expected one batched re-render, received ${renderCount}.`);
      }
    }),
    await runAsyncCase("unmount cancels a pending microtask update", async () => {
      const root = document.createElement("div");
      let setCount = null;

      function App() {
        const [count, updateCount] = useState(0);
        setCount = updateCount;
        return h("div", null, String(count));
      }

      const app = createApp({
        root,
        component: App,
        batching: "microtask",
      });

      app.mount();
      setCount(1);
      app.unmount();
      await Promise.resolve();

      if (root.childNodes.length !== 0) {
        throw new Error("Expected unmount to clear the root even with a queued update.");
      }
    })
  );

  return cases;
}
