import type { Page, Route } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3001/api";

export interface MockedSessionOptions {
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  developerOptionsValid?: boolean;
  showDetailedResults?: boolean;
  onboardingCompletedAt?: string | null;
  failProfileLoad?: boolean;
  failProfileUpdate?: boolean;
  failEmailUpdate?: boolean;
  failOnboardingCompletion?: boolean;
}

export interface ApiSpy {
  method: string;
  url: string;
  headers: Record<string, string>;
  postData: string;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

export async function seedSignedInSession(page: Page, options: MockedSessionOptions = {}): Promise<void> {
  const userId = options.userId ?? "user-1";
  const email = options.email ?? "inspector@example.com";

  await page.addInitScript(({ userId: initUserId, initEmail }) => {
    window.localStorage.setItem(
      "meatlens-auth-user",
      JSON.stringify({
        id: initUserId,
        email: initEmail,
      })
    );
    window.localStorage.setItem(
      "meatlens-auth-session",
      JSON.stringify({
        access_token: "session-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Date.now() + 3600_000,
      })
    );
  }, { userId: userId, initEmail: email });
}

export async function seedDeveloperOptionsSession(page: Page, userId: string): Promise<void> {
  await page.addInitScript(({ currentUserId }) => {
    window.localStorage.setItem(
      `meatlens-developer-options-session:${currentUserId}`,
      JSON.stringify({
        token: "developer-session-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
    );
  }, { currentUserId: userId });
}

export async function mockCommonApi(
  page: Page,
  options: MockedSessionOptions = {},
  spies?: ApiSpy[]
): Promise<void> {
  const userId = options.userId ?? "user-1";
  const email = options.email ?? "inspector@example.com";
  const isAdmin = options.isAdmin ?? false;
  const developerOptionsValid = options.developerOptionsValid ?? false;
  const showDetailedResults = options.showDetailedResults ?? true;
  const onboardingCompletedAt =
    options.onboardingCompletedAt === undefined
      ? "2026-05-31T03:00:00.000Z"
      : options.onboardingCompletedAt;
  const inspectionCreatedAt = new Date().toISOString();
  const profilesState = [
    {
      id: userId,
      full_name: "Inspector",
      avatar_url: null,
      inspector_code: "INSP-001",
      report_organization: "gordon_college_ccs",
      is_dark_mode: false,
      show_detailed_results: showDetailedResults,
      onboarding_completed_at: onboardingCompletedAt,
      onboarding_version: 1,
      email,
      location: "North Market",
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "user-2",
      full_name: "Blair",
      avatar_url: null,
      inspector_code: "INSP-002",
      report_organization: null,
      is_dark_mode: false,
      show_detailed_results: true,
      onboarding_completed_at: "2026-04-02T03:00:00.000Z",
      onboarding_version: 1,
      email: "blair@example.com",
      location: "South Market",
      created_at: "2026-04-02T00:00:00.000Z",
      updated_at: "2026-04-02T00:00:00.000Z",
    },
  ];

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      await route.fallback();
      return;
    }

    if (spies) {
      const headers = request.headers();
      spies.push({
        method,
        url: request.url(),
        headers,
        postData: request.postData() ?? "",
      });
    }

    if (path === "/api/analysis/health") {
      await route.fulfill(jsonResponse({ status: "ok" }));
      return;
    }

    if (path === "/api/developer-options/verify" && method === "POST") {
      await route.fulfill(jsonResponse({ valid: developerOptionsValid }));
      return;
    }

    if (path === `/api/profiles/${userId}` && method === "GET") {
      if (options.failProfileLoad) {
        await route.fulfill(jsonResponse({ error: "Failed to fetch profile" }, 500));
        return;
      }

      const profileState = profilesState.find((profile) => profile.id === userId) ?? null;
      await route.fulfill(jsonResponse(profileState));
      return;
    }

    if (path === `/api/profiles/${userId}` && method === "PUT") {
      const payload = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
      const profileState = profilesState.find((profile) => profile.id === userId);

      if (!profileState) {
        await route.fulfill(jsonResponse({ error: "Profile not found" }, 404));
        return;
      }

      if (options.failProfileUpdate && !("onboarding_completed_at" in payload)) {
        await route.fulfill(jsonResponse({ error: "Failed to save profile" }, 500));
        return;
      }

      if (options.failOnboardingCompletion && "onboarding_completed_at" in payload) {
        await route.fulfill(jsonResponse({ error: "Failed to finish onboarding" }, 500));
        return;
      }

      Object.assign(profileState, payload, {
        updated_at: "2026-05-31T00:00:00.000Z",
      });

      await route.fulfill(jsonResponse(profileState));
      return;
    }

    if (path === `/api/auth/users/${userId}/email` && method === "PATCH") {
      const profileState = profilesState.find((profile) => profile.id === userId);
      if (!profileState) {
        await route.fulfill(jsonResponse({ error: "Profile not found" }, 404));
        return;
      }

      if (options.failEmailUpdate) {
        await route.fulfill(jsonResponse({ error: "Failed to update email" }, 500));
        return;
      }

      const payload = JSON.parse(request.postData() ?? "{}") as { email?: string };
      profileState.email = payload.email?.trim() ?? profileState.email;

      await route.fulfill(
        jsonResponse({
          id: userId,
          email: profileState.email,
        }),
      );
      return;
    }

    if (path === "/api/profiles/admin/users" && method === "POST") {
      const payload = JSON.parse(request.postData() ?? "{}") as {
        email?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        report_organization?: string | null;
        location?: string | null;
      };

      const createdUser = {
        id: `user-${profilesState.length + 1}`,
        full_name: payload.full_name ?? null,
        avatar_url: null,
        inspector_code: payload.inspector_code ?? null,
        report_organization: payload.report_organization ?? null,
        is_dark_mode: false,
        show_detailed_results: true,
        onboarding_completed_at: null,
        onboarding_version: 1,
        email: payload.email ?? null,
        location: payload.location ?? null,
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
      };

      profilesState.unshift(createdUser);
      await route.fulfill(jsonResponse(createdUser, 201));
      return;
    }

    if (/^\/api\/profiles\/admin\/users\/[^/]+$/.test(path) && method === "PUT") {
      const userIdToUpdate = path.split("/").pop();
      const payload = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
      const profileState = profilesState.find((profile) => profile.id === userIdToUpdate);

      if (!profileState) {
        await route.fulfill(jsonResponse({ error: "Profile not found" }, 404));
        return;
      }

      Object.assign(profileState, payload, {
        updated_at: "2026-04-04T00:00:00.000Z",
      });

      await route.fulfill(jsonResponse(profileState));
      return;
    }

    if (/^\/api\/profiles\/[^/]+\/has-role\/[^/]+$/.test(path)) {
      await route.fulfill(jsonResponse({ hasRole: isAdmin }));
      return;
    }

    if (path === "/api/profiles/stats") {
      await route.fulfill(
        jsonResponse({
          total_users: 2,
          total_inspections: 3,
          roles: [{ role: "admin", count: 1 }],
        })
      );
      return;
    }

    if (path === "/api/profiles") {
      await route.fulfill(jsonResponse(profilesState));
      return;
    }

    if (path === "/api/inspections/stats") {
      await route.fulfill(jsonResponse({ total: 3, byClassification: { fresh: 1, spoiled: 1, warning: 1 } }));
      return;
    }

    if (path === "/api/inspections" && method === "GET") {
      await route.fulfill(
        jsonResponse([
          {
            id: "inspection-1",
            user_id: userId,
            meat_type: "pork",
            classification: "fresh",
            confidence_score: 95,
            flagged_deviations: [],
            explanation: "Looks fresh",
            image_url: null,
            location: "North Market",
            inspector_notes: null,
            created_at: inspectionCreatedAt,
            updated_at: inspectionCreatedAt,
          },
        ])
      );
      return;
    }

    if (path === "/api/inspections" && method === "POST") {
      await route.fulfill(
        jsonResponse({
          id: "inspection-created",
          user_id: userId,
          created_at: inspectionCreatedAt,
          updated_at: inspectionCreatedAt,
        })
      );
      return;
    }

    if (path === "/api/access-codes") {
      await route.fulfill(jsonResponse([]));
      return;
    }

    if (path === "/api/market-locations" && method === "GET") {
      await route.fulfill(
        jsonResponse([
          { id: "market-1", name: "Old Market", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
          { id: "market-2", name: "New Market", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
          { id: "market-3", name: "Pag-asa Market", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
          { id: "market-4", name: "Baretto Talipapa", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
          { id: "market-5", name: "Old Cabalan Talipapa", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
          { id: "market-6", name: "New Cabalan Talipapa", created_at: "2026-05-03T00:00:00.000Z", updated_at: "2026-05-03T00:00:00.000Z" },
        ])
      );
      return;
    }

    if (path === "/api/market-locations" && method === "POST") {
      const payload = JSON.parse(request.postData() ?? "{}") as { name?: string };
      const normalizedName = payload.name?.trim() || "Unnamed Market";
      await route.fulfill(
        jsonResponse({
          id: `market-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new"}`,
          name: normalizedName,
          created_at: "2026-05-03T00:00:00.000Z",
          updated_at: "2026-05-03T00:00:00.000Z",
        }, 201)
      );
      return;
    }

    if (/^\/api\/market-locations\/[^/]+$/.test(path) && method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (path === "/api/upload/inspection-image" && method === "POST") {
      await route.fulfill(jsonResponse({ imageUrl: "https://example.com/sample.jpg" }));
      return;
    }

    if (path === "/api/analysis/analyze" && method === "POST") {
      await route.fulfill(
        jsonResponse({
          classification: "fresh",
          confidence_score: 95,
          flagged_deviations: [],
          explanation: "Backend fallback",
        })
      );
      return;
    }

    await route.fulfill(jsonResponse({ message: "Unhandled mock API route", path }, 404));
  });
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
