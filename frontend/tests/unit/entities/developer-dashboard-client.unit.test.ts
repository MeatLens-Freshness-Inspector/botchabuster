import assert from "node:assert/strict";
import test from "node:test";
import { developerDashboardClient } from "../../../src/entities/developer-metrics/api/developer-dashboard-client";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("lists complete dispute history from the admin endpoint", async () => {
  let requestUrl = "";
  const responseRecords = [{ id: "dispute-1", status: "approved" }];
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    requestUrl = String(input);
    return new Response(JSON.stringify(responseRecords), { status: 200 });
  });

  try {
    const result = await developerDashboardClient.listInspectionResultDisputeHistory();
    assert.deepEqual(result, responseRecords);
  } finally {
    restoreTransportFetch();
  }

  assert.match(requestUrl, /\/developer-dashboard\/disputes\/history$/);
});
