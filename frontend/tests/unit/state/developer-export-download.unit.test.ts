import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { downloadDeveloperDatasetBlob } from "../../../src/features/developer-tools/model/use-developer-dashboard";

test("developer dataset download delays object URL cleanup until after the click", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const previousDocument = globalThis.document;
  const previousCreateObjectUrl = URL.createObjectURL;
  const previousRevokeObjectUrl = URL.revokeObjectURL;
  const previousClick = dom.window.HTMLAnchorElement.prototype.click;
  let revokedUrl: string | null = null;
  let clickedDownload: string | null = null;

  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:dataset-export" });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => {
      revokedUrl = url;
    },
  });
  Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", {
    configurable: true,
    value: function click(this: HTMLAnchorElement) {
      clickedDownload = this.download;
    },
  });

  try {
    downloadDeveloperDatasetBlob(new Blob(["zip"]), "dataset.zip", 5);
    assert.equal(clickedDownload, "dataset.zip");
    assert.equal(revokedUrl, null);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(revokedUrl, "blob:dataset-export");
  } finally {
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: previousCreateObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: previousRevokeObjectUrl });
    Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", { configurable: true, value: previousClick });
    dom.window.close();
  }
});
