import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { downloadDeveloperDatasetUrl } from "../../../src/features/developer-tools/model/use-developer-dashboard";

test("developer dataset download uses a signed URL without creating a Blob or object URL", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const previousDocument = globalThis.document;
  const previousCreateObjectUrl = URL.createObjectURL;
  const previousClick = dom.window.HTMLAnchorElement.prototype.click;
  let clickedHref: string | null = null;
  let clickedDownload: string | null = null;
  let objectUrlCreated = false;

  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => {
      objectUrlCreated = true;
      return "blob:unexpected";
    },
  });
  Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", {
    configurable: true,
    value: function click(this: HTMLAnchorElement) {
      clickedHref = this.href;
      clickedDownload = this.download;
    },
  });

  try {
    downloadDeveloperDatasetUrl(
      "https://storage.example.test/export-1/dataset.zip?download=dataset.zip",
      "dataset.zip",
    );
    assert.equal(clickedHref, "https://storage.example.test/export-1/dataset.zip?download=dataset.zip");
    assert.equal(clickedDownload, "dataset.zip");
    assert.equal(objectUrlCreated, false);
  } finally {
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: previousCreateObjectUrl });
    Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", { configurable: true, value: previousClick });
    dom.window.close();
  }
});
