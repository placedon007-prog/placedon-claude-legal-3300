import assert from "node:assert/strict";
import { test } from "node:test";
import { guardFileDrops, isFileDrag } from "../src/lib/file-drop";

function dragEvent(type: string, types: string[]): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { types } });
  return event;
}

test("a stray file drop is cancelled so the browser cannot open the file over the console", () => {
  const target = new EventTarget();
  const stop = guardFileDrops(target);
  for (const type of ["dragover", "drop"]) {
    const event = dragEvent(type, ["Files"]);
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, `${type} with files is cancelled`);
  }
  stop();
  const after = dragEvent("drop", ["Files"]);
  target.dispatchEvent(after);
  assert.equal(after.defaultPrevented, false, "cleanup removes the guard");
});

test("dragging text or a link inside the page keeps the browser default", () => {
  const target = new EventTarget();
  const stop = guardFileDrops(target);
  const event = dragEvent("drop", ["text/plain", "text/uri-list"]);
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  stop();
});

test("isFileDrag reads only the Files type and tolerates a missing transfer", () => {
  assert.equal(isFileDrag({ dataTransfer: { types: ["Files"] } }), true);
  assert.equal(isFileDrag({ dataTransfer: { types: ["text/plain"] } }), false);
  assert.equal(isFileDrag({ dataTransfer: null }), false);
  assert.equal(isFileDrag({}), false);
});
