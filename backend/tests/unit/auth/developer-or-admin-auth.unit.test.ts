import assert from "node:assert/strict";
import { test } from "node:test";

test("calibration access allows administrators and developers but not regular users", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
  const { hasDeveloperOrAdminAccess } = await import("../../../src/middleware/auth");
  assert.equal(hasDeveloperOrAdminAccess({ isAdmin: true, isDeveloper: false }), true);
  assert.equal(hasDeveloperOrAdminAccess({ isAdmin: false, isDeveloper: true }), true);
  assert.equal(hasDeveloperOrAdminAccess({ isAdmin: false, isDeveloper: false }), false);
});
