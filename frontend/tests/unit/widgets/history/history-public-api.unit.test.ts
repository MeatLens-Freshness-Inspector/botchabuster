import assert from "node:assert/strict";
import test from "node:test";
import {
  HistoryHeader,
  HistorySidebar,
  InspectionTimelineSection,
  useHistory,
} from "../../../../src/widgets/history";

test("history publishes its page-owned UI and model through the widget API", () => {
  assert.equal(typeof HistoryHeader, "function");
  assert.equal(typeof HistorySidebar, "function");
  assert.equal(typeof InspectionTimelineSection, "function");
  assert.equal(typeof useHistory, "function");
});
