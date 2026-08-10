import assert from "node:assert/strict";
import { test } from "node:test";
import { ListMarketLocations } from "../../../src/modules/markets/application/ListMarketLocations";
import { CreateMarketLocation } from "../../../src/modules/markets/application/CreateMarketLocation";
import { DeleteMarketLocation } from "../../../src/modules/markets/application/DeleteMarketLocation";

test("market location use cases delegate through explicit ports", async () => {
  const location = { id: "1", name: "Market", created_at: "now", updated_at: "now" };
  const port = { getAll: async () => [location], create: async () => location, delete: async () => undefined };
  assert.deepEqual(await new ListMarketLocations(port).execute(), [location]);
  assert.equal((await new CreateMarketLocation(port).execute("Market")).id, "1");
  await new DeleteMarketLocation(port).execute("1");
});
