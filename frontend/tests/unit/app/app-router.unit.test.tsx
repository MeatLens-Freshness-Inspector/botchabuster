import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "../../../src/app/router/app-router";

const routeElements = {
  landing: <span>landing</span>,
  login: <span>login</span>,
  signup: <span>signup</span>,
  forgotPassword: <span>forgot password</span>,
  resetPassword: <span>reset password</span>,
  onboarding: <span>onboarding</span>,
  inspect: <span>inspect</span>,
  history: <span>history</span>,
  messages: <span>messages</span>,
  profile: <span>profile</span>,
  profileTutorial: <span>profile tutorial</span>,
  profileHelp: <span>profile help</span>,
  profileHelpScope: <span>profile help scope</span>,
  admin: <span>admin</span>,
  notFound: <span>not found</span>,
};

test("application router preserves the login and not-found route contracts", () => {
  const loginMarkup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/login"]}>
      <AppRouter elements={routeElements} />
    </MemoryRouter>
  );
  const missingMarkup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/missing-route"]}>
      <AppRouter elements={routeElements} />
    </MemoryRouter>
  );

  assert.match(loginMarkup, />login</);
  assert.match(missingMarkup, />not found</);
});
