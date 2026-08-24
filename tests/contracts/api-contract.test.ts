import assert from "node:assert/strict";
import test from "node:test";
import "../../backend/tests/setup/env";
import type { AuthBootstrapPayload } from "../../frontend/src/integrations/api/AuthClient";
import type { AnalysisResult, Inspection as FrontendInspection } from "../../frontend/src/types/inspection";
import type { Inspection as BackendInspection } from "../../backend/src/types/inspection";
import { auditLogService } from "../../backend/src/modules/audit/infrastructure/AuditLogService";
import { authService } from "../../backend/src/modules/auth/infrastructure/SupabaseAuthFactory";
import { inspectionService } from "../../backend/src/modules/inspections/infrastructure/InspectionService";
import { profileService } from "../../backend/src/modules/users/infrastructure/ProfileService";
import { getSessionLimitService } from "../../backend/src/modules/auth/infrastructure/SessionLimitService";
import { startTestServer } from "../../backend/tests/support/appFactory";
import { createProfileFixture, createUserFixture } from "../../backend/tests/support/fixtures";
import { assertAnalysisResponseSchema } from "./schemas/analysis-response.schema";
import { assertErrorResponseSchema } from "./schemas/error-response.schema";
import { assertInspectionListSchema } from "./schemas/inspection.schema";

function assertAuthBootstrapPayload(value: unknown): asserts value is AuthBootstrapPayload {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "Auth bootstrap payload must be an object");
  const payload = value as Record<string, unknown>;
  assert.ok(payload.user && typeof payload.user === "object", "Auth bootstrap payload must include user");
  assert.equal(typeof (payload.user as { id?: unknown }).id, "string", "Auth bootstrap user.id must be a string");
  assert.ok(payload.profile && typeof payload.profile === "object", "Auth bootstrap payload must include profile");
  assert.ok(payload.session && typeof payload.session === "object", "Auth bootstrap payload must include session");
  assert.ok(Array.isArray(payload.roles), "Auth bootstrap payload must include roles");
  assert.equal(typeof payload.primaryRole, "string", "Auth bootstrap payload must include primaryRole");
  assert.equal(typeof payload.isAdmin, "boolean", "Auth bootstrap payload must include isAdmin");
  assert.equal(typeof payload.isDeveloper, "boolean", "Auth bootstrap payload must include isDeveloper");
  assert.equal(typeof payload.csrfToken, "string", "Auth bootstrap payload must include csrfToken");
  assert.equal(typeof payload.authenticatedAt, "string", "Auth bootstrap payload must include authenticatedAt");
  assert.equal(typeof payload.offlineExpiresAt, "string", "Auth bootstrap payload must include offlineExpiresAt");
  assert.equal("access_token" in payload, false, "Auth bootstrap payload must not leak top-level access_token");
  assert.equal("refresh_token" in payload, false, "Auth bootstrap payload must not leak top-level refresh_token");
}

function createSharedInspectionFixture(): FrontendInspection & BackendInspection {
  return {
    id: "inspection-test-001",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    manual_classification: "fresh",
    confidence_score: 0.91,
    flagged_deviations: [],
    explanation: "Confident fresh classification.",
    image_url: "https://example.com/inspection-test-001.jpg",
    location: "Olongapo",
    location_latitude: 14.8292,
    location_longitude: 120.2822,
    stall_number: "12",
    meat_inspection_certificate_proof: null,
    meat_expiry_date: "2026-08-02",
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    inspection_decision_source: "ai",
    protocol_spoiled_reason: null,
    inspector_notes: null,
    client_submission_id: "client-submission-001",
    captured_at: "2026-08-02T10:00:00.000Z",
    created_at: "2026-08-02T10:00:00.000Z",
    updated_at: "2026-08-02T10:00:00.000Z",
  };
}

test("auth sign-in responses match the frontend bootstrap contract", async () => {
  const originalSignIn = authService.signIn.bind(authService);
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneInactiveSessions = sessionLimit.pruneInactiveSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = createUserFixture();
  const profile = createProfileFixture(user.id);

  authService.signIn = async () => ({ user, session: null });
  profileService.getPrivilegeSummary = async () => ({
    roles: [],
    primaryRole: "inspector",
    isAdmin: false,
    isDeveloper: false,
  });
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneInactiveSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async () => undefined;

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: "correct-horse-battery-staple" }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assertAuthBootstrapPayload(body);
    assert.equal(body.user.id, user.id);
    assert.equal(body.profile.id, profile.id);
  } finally {
    authService.signIn = originalSignIn;
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneInactiveSessions = originalPruneInactiveSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("inspection list responses match the shared frontend and backend inspection contract", async () => {
  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);
  const originalGetAll = inspectionService.getAll.bind(inspectionService);

  const inspection = createSharedInspectionFixture();

  authService.getUserByAccessToken = async () => ({
    id: "admin-1",
    email: "admin@example.com",
  });
  profileService.getPrivilegeSummary = async () => ({
    roles: [{ id: "role-1", user_id: "admin-1", role: "admin" }],
    primaryRole: "admin",
    isAdmin: true,
    isDeveloper: false,
  });
  inspectionService.getAll = async () => [inspection];

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/inspections?limit=1&offset=0&scope=all`, {
      headers: {
        Authorization: "Bearer admin-token",
      },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assertInspectionListSchema(body);
    assert.equal(body[0].id, inspection.id);
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    inspectionService.getAll = originalGetAll;
    await close();
  }
});

test("error responses stay on the shared error envelope contract", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{\"email\":",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assertErrorResponseSchema(body);
  } finally {
    await close();
  }
});

test("analysis result fixtures stay on the shared frontend contract", () => {
  const analysis: AnalysisResult = {
    classification: "fresh",
    confidence_score: 0.93,
    model_confidence_score: 0.91,
    rule_confidence_score: 0.95,
    freshness_score: 0.9,
    recommendation: "Good for Consumption",
    probabilities: {
      fresh: 0.93,
      spoiled: 0.02,
      warning: 0.05,
    },
    label_order: ["fresh", "warning", "spoiled"],
    flagged_deviations: [],
    explanation: "The sample appears fresh.",
    analysis_source: "resnet50",
    model_path: "models/resnet50_meat/meatlens_resnet50_exp2.onnx",
  };

  assertAnalysisResponseSchema(analysis);
});
