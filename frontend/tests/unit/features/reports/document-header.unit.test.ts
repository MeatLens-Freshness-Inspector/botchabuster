import assert from "node:assert/strict";
import test from "node:test";

import { buildReportDocumentHeader } from "../../../../src/features/reports/lib/pdf/document-header";

test("report document header preserves letter-page metadata", () => {
  const header = buildReportDocumentHeader(
    {
      title: "Daily Report",
      subtitle: "January",
      templateKey: "gcccs",
      kind: "inspector_daily",
    },
    {
      displayName: "GCCCS",
    },
    {
      backgroundAssetPath: "data:image/png;base64,asset",
      pageMargins: [52, 120, 52, 92],
      footerMargin: [0, 0, 52, 54],
      sectionColor: "#111827",
      bodyColor: "#334155",
      tableHeaderFillColor: "#E5E7EB",
      tableHeaderTextColor: "#111827",
      pageNumberColor: "#334155",
    }
  );

  assert.equal(header.pageSize, "LETTER");
  assert.deepEqual(header.pageMargins, [52, 120, 52, 92]);
  assert.equal(header.info?.title, "Daily Report - GCCCS");
});
