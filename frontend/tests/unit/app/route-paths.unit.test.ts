import assert from "node:assert/strict";
import test from "node:test";

import { ROUTE_CONTRACT_PATHS, ROUTE_PATHS } from "../../../src/app/router/paths";

test("route path constants preserve the existing public and protected URLs", () => {
  assert.deepEqual(ROUTE_PATHS, {
    landing: "/",
    login: "/login",
    signup: "/signup",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    onboarding: "/onboarding",
    inspect: "/inspect",
    history: "/history",
    messages: "/messages",
    dashboard: "/dashboard",
    profile: "/profile",
    profileTutorial: "/profile/tutorial",
    profileHelp: "/profile/help",
    profileHelpScope: "/profile/help/scope",
    admin: "/admin",
    notFound: "*",
  });

  assert.deepEqual(ROUTE_CONTRACT_PATHS, [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/inspect",
    "/history",
    "/messages",
    "/profile",
    "/profile/tutorial",
    "/profile/help",
    "/profile/help/scope",
    "/admin",
  ]);
});
