import "../setup/env";

export function createUserFixture(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: "user-1",
    email: "inspector@example.com",
    ...overrides,
  };
}

export function createProfileFixture(userId = "user-1", overrides: Record<string, unknown> = {}) {
  return {
    id: userId,
    full_name: "Inspector Example",
    avatar_url: null,
    inspector_code: "INS-123",
    report_organization: "dti",
    is_dark_mode: false,
    show_detailed_results: false,
    onboarding_completed_at: "2026-07-01T00:00:00.000Z",
    onboarding_version: 1,
    location: "Olongapo",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}
