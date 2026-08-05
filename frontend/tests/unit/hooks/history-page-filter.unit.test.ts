import assert from "node:assert/strict";
import test from "node:test";
import type { Inspection } from "../../../src/types/inspection";

const sampleInspections: Inspection[] = [
  {
    id: "insp-1",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 95,
    flagged_deviations: [],
    explanation: "Fresh pork",
    image_url: null,
    location: "Market 1",
    location_latitude: null,
    location_longitude: null,
    stall_number: "101",
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    inspection_decision_source: "ai",
    protocol_spoiled_reason: null,
    inspector_notes: null,
    captured_at: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "insp-2",
    user_id: "user-1",
    meat_type: "beef",
    classification: "spoiled",
    confidence_score: 88,
    flagged_deviations: [],
    explanation: "Spoiled beef",
    image_url: null,
    location: "Market 2",
    location_latitude: null,
    location_longitude: null,
    stall_number: "102",
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    storage_correct: false,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    inspection_decision_source: "ai",
    protocol_spoiled_reason: null,
    inspector_notes: null,
    captured_at: null,
    created_at: "2026-08-05T14:00:00.000Z",
    updated_at: "2026-08-05T14:00:00.000Z",
  },
];

test("history date filtering defaults to showing all inspections and supports clearing date", () => {
  // Simulating the date range calculation in useHistoryPage
  function filterInspections(selectedReportDay: string, activeFilter: string) {
    const reportDayDate = selectedReportDay ? new Date(`${selectedReportDay}T00:00:00`) : null;
    const hasValidReportDay = reportDayDate !== null && !Number.isNaN(reportDayDate.getTime());
    const selectedDayRange = hasValidReportDay && reportDayDate ? {
      start: new Date(reportDayDate.setHours(0, 0, 0, 0)),
      end: new Date(reportDayDate.setHours(23, 59, 59, 999)),
    } : null;

    return sampleInspections.filter((inspection) => {
      if (selectedDayRange) {
        const createdAt = new Date(inspection.created_at);
        if (createdAt < selectedDayRange.start || createdAt > selectedDayRange.end) {
          return false;
        }
      }
      if (activeFilter !== "all" && inspection.classification !== activeFilter) {
        return false;
      }
      return true;
    });
  }

  // Initial state: selectedReportDay is ""
  const defaultResults = filterInspections("", "all");
  assert.equal(defaultResults.length, 2, "Default state without date filter should show all 2 inspections");

  // Filtered by a specific day (August 5, 2026)
  const aug5Results = filterInspections("2026-08-05", "all");
  assert.equal(aug5Results.length, 1, "Filtering by 2026-08-05 should yield only 1 inspection");
  assert.equal(aug5Results[0].id, "insp-2");

  // Cleared date filter (reset to "")
  const clearedResults = filterInspections("", "all");
  assert.equal(clearedResults.length, 2, "Clearing date filter returns to showing all 2 inspections");
});
