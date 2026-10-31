import assert from "node:assert/strict";
import { test } from "node:test";
import { catchStrayFileDrops, guardFileDrops, isFileDrag } from "../src/lib/file-drop";

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

function fileDrop(type: string, files: unknown[] = []): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { types: ["Files"], files } });
  return event;
}

test("a file dropped where no drop zone took it goes to the composer", () => {
  const target = new EventTarget();
  const got: unknown[] = [];
  const stop = catchStrayFileDrops(target, (files) => got.push(files));
  const files = [{ name: "contract.pdf" }];
  const event = fileDrop("drop", files);
  target.dispatchEvent(event);
  assert.deepEqual(got, [files], "the stray files are handed over once");
  assert.equal(event.defaultPrevented, true, "the browser does not open the file");
  stop();
  target.dispatchEvent(fileDrop("drop", files));
  assert.equal(got.length, 1, "cleanup stops forwarding");
});

test("a drop that a drop zone already handled is not attached twice", () => {
  const target = new EventTarget();
  let calls = 0;
  const stop = catchStrayFileDrops(target, () => { calls += 1; });
  const event = fileDrop("drop", [{ name: "a.pdf" }]);
  event.preventDefault(); // the composer or a page drop zone took it first
  target.dispatchEvent(event);
  assert.equal(calls, 0);
  stop();
});

test("dragging text into the page is never treated as an attachment", () => {
  const target = new EventTarget();
  let calls = 0;
  const stop = catchStrayFileDrops(target, () => { calls += 1; });
  target.dispatchEvent(dragEvent("drop", ["text/plain"]));
  assert.equal(calls, 0);
  stop();
});

test("the composer is told while a file is dragged over the page, and when it stops", () => {
  const target = new EventTarget();
  const states: boolean[] = [];
  const stop = catchStrayFileDrops(target, () => {}, (on) => states.push(on));
  target.dispatchEvent(fileDrop("dragover"));
  const leave = new Event("dragleave");
  Object.defineProperty(leave, "relatedTarget", { value: null }); // pointer left the window
  target.dispatchEvent(leave);
  target.dispatchEvent(fileDrop("dragover"));
  target.dispatchEvent(fileDrop("drop", [{ name: "a.pdf" }]));
  assert.deepEqual(states, [true, false, true, false]);
  stop();
});
