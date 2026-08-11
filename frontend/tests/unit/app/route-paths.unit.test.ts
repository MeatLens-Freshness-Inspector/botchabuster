import assert from "node:assert/strict";
import test from "node:test";

import { ROUTE_PATHS } from "../../../src/app/router/paths";

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
});
