import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { ExportLoadingOverlay } from "../../../src/shared/ui/export-loading-overlay";
import { ExportLoadingOverlay as SharedExportLoadingOverlay } from "../../../src/shared/ui";

test("export loading overlay is hidden until an export is active", () => {
  assert.equal(renderToStaticMarkup(<ExportLoadingOverlay visible={false} message="Preparing export..." />), "");
});

test("export loading overlay announces its active export status", () => {
  const markup = renderToStaticMarkup(
    <ExportLoadingOverlay visible message="Preparing dataset export..." />,
  );

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /Preparing dataset export\.\.\./);
  assert.match(markup, /animate-spin/);
});

test("shared ui publishes the export loading overlay", () => {
  assert.equal(SharedExportLoadingOverlay, ExportLoadingOverlay);
});
