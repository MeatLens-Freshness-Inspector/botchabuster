import assert from "node:assert/strict";
import test from "node:test";
import {
  ProfileHelpPageView,
  ProfileTutorialPageView,
  useProfileHelpPage,
  useProfileTutorialPage,
} from "../../../../src/features/tutorials";

test("tutorials publishes profile help and tutorial page ownership", () => {
  assert.equal(typeof ProfileHelpPageView, "function");
  assert.equal(typeof ProfileTutorialPageView, "function");
  assert.equal(typeof useProfileHelpPage, "function");
  assert.equal(typeof useProfileTutorialPage, "function");
});
