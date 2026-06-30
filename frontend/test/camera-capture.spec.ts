import { test, expect, type Page } from "@playwright/test";
import {
  mockCommonApi,
  seedDeveloperOptionsSession,
  seedSignedInSession,
} from "./helpers/app";

interface MockCameraOptions {
  capabilities?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

async function installMockCamera(page: Page, options: MockCameraOptions = {}): Promise<void> {
  await page.addInitScript((rawOptions: MockCameraOptions) => {
    const defaultCapabilities = {
      torch: true,
      focusMode: ["continuous", "manual"],
      focusDistance: { min: 0, max: 10, step: 0.5 },
      brightness: { min: -2, max: 2, step: 0.1 },
      exposureCompensation: { min: -2, max: 2, step: 0.1 },
      aperture: { min: 1.8, max: 16, step: 0.1 },
      zoom: { min: 1, max: 3, step: 0.1 },
    };

    const capabilities = {
      ...defaultCapabilities,
      ...(rawOptions.capabilities ?? {}),
    };

    const settings: Record<string, unknown> = {
      torch: false,
      focusMode: "continuous",
      focusDistance: 2,
      brightness: 0,
      exposureCompensation: 0,
      aperture: 2.8,
      zoom: 1,
      ...(rawOptions.settings ?? {}),
    };

    (window as Window & { __cameraMock?: unknown }).__cameraMock = {
      appliedConstraints: [] as Array<Record<string, unknown>>,
      requestedGetUserMediaArgs: [] as Array<Record<string, unknown>>,
    };

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {},
      });
    }

    const getUserMediaMock = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      const state = (window as Window & { __cameraMock?: { requestedGetUserMediaArgs: unknown[] } }).__cameraMock;
      state?.requestedGetUserMediaArgs.push(constraints as unknown as Record<string, unknown>);

      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(170, 110, 300, 260);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 12;
        ctx.strokeRect(170, 110, 300, 260);
        ctx.fillStyle = "#b91c1c";
        ctx.fillRect(250, 180, 140, 120);
      }

      const stream = canvas.captureStream(15);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, "getCapabilities", {
        configurable: true,
        value: () => capabilities,
      });

      Object.defineProperty(track, "getSettings", {
        configurable: true,
        value: () => settings,
      });

      Object.defineProperty(track, "applyConstraints", {
        configurable: true,
        value: async (newConstraints: MediaTrackConstraints) => {
        const mockState = (window as Window & { __cameraMock?: { appliedConstraints: unknown[] } }).__cameraMock;
        mockState?.appliedConstraints.push(newConstraints as unknown as Record<string, unknown>);

        const advanced = Array.isArray(newConstraints.advanced) ? newConstraints.advanced[0] : null;
        if (advanced && typeof advanced === "object") {
          Object.entries(advanced).forEach(([key, value]) => {
            settings[key] = value;
          });
        }
        },
      });

      return stream;
    };

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: getUserMediaMock,
    });
  }, options);
}

async function setRangeInputValue(page: Page, labelPattern: RegExp, value: number): Promise<void> {
  await page.getByLabel(labelPattern).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, `${nextValue}`);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("inspectors only see the default open camera entrypoint", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await expect(page.locator('label[role="button"]').filter({ hasText: "Open Camera" })).toBeVisible();
  await expect(page.getByText("Use Camera App")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /in-app cam/i })).toHaveCount(0);
  await expect(page.locator('input[type="file"][capture="environment"]')).toHaveCount(1);
});

test("open camera uses a directly tappable capture input for iOS compatibility", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");

  const cameraInput = page.getByLabel(/open camera/i);
  await expect(cameraInput).toHaveAttribute("capture", "environment");
  await expect(cameraInput).not.toHaveCSS("display", "none");
});

test("developer-unlocked admins can use the in-app camera option", async ({ page }) => {
  await installMockCamera(page);
  await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
  await seedDeveloperOptionsSession(page, "admin-1");
  await mockCommonApi(page, {
    userId: "admin-1",
    isAdmin: true,
    developerOptionsValid: true,
  });

  await page.goto("/inspect");
  await expect(page.getByRole("button", { name: /in-app cam/i })).toBeVisible();

  await page.getByRole("button", { name: /in-app cam/i }).click();
  await expect(page.getByRole("button", { name: /capture/i })).toBeVisible();
});

test("manual camera controls apply focus and exposure constraints when supported", async ({ page }) => {
  await installMockCamera(page);
  await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
  await seedDeveloperOptionsSession(page, "admin-1");
  await mockCommonApi(page, { userId: "admin-1", isAdmin: true, developerOptionsValid: true });

  await page.goto("/inspect");
  await page.getByRole("button", { name: /in-app cam/i }).click();
  await expect(page.getByRole("button", { name: /capture/i })).toBeVisible();

  await expect(page.getByText(/camera controls/i)).toBeVisible();
  await expect(page.getByLabel(/focus mode/i)).toBeVisible();
  await expect(page.getByLabel(/manual focus/i)).toBeVisible();
  await expect(page.getByLabel(/brightness/i)).toBeVisible();
  await expect(page.getByLabel(/exposure/i)).toBeVisible();
  await expect(page.getByLabel(/aperture/i)).toBeVisible();

  await page.getByLabel(/focus mode/i).selectOption("manual");
  await setRangeInputValue(page, /manual focus/i, 7);
  await setRangeInputValue(page, /brightness/i, 1.2);
  await setRangeInputValue(page, /exposure/i, 0.8);
  await setRangeInputValue(page, /aperture/i, 5.6);

  await expect
    .poll(async () => {
      const applied = await page.evaluate(() => {
        const state = (window as Window & { __cameraMock?: { appliedConstraints?: unknown[] } }).__cameraMock;
        return state?.appliedConstraints ?? [];
      });
      return applied.length;
    })
    .toBeGreaterThan(2);

  const hasManualFocus = await page.evaluate(() => {
    const state = (window as Window & { __cameraMock?: { appliedConstraints?: Array<{ advanced?: unknown[] }> } }).__cameraMock;
    const applied = state?.appliedConstraints ?? [];
    return applied.some((entry) =>
      Array.isArray(entry.advanced) && entry.advanced.some((item) => (item as { focusMode?: string }).focusMode === "manual")
    );
  });
  expect(hasManualFocus).toBeTruthy();

  const hasExposure = await page.evaluate(() => {
    const state = (window as Window & { __cameraMock?: { appliedConstraints?: Array<{ advanced?: unknown[] }> } }).__cameraMock;
    const applied = state?.appliedConstraints ?? [];
    return applied.some((entry) =>
      Array.isArray(entry.advanced) &&
      entry.advanced.some((item) => typeof (item as { exposureCompensation?: unknown }).exposureCompensation === "number")
    );
  });
  expect(hasExposure).toBeTruthy();
});

test("shows unsupported message when manual controls are unavailable", async ({ page }) => {
  await installMockCamera(page, {
    capabilities: {
      torch: false,
      focusMode: [],
      focusDistance: null,
      brightness: null,
      exposureCompensation: null,
      aperture: null,
      zoom: null,
    },
    settings: {},
  });
  await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
  await seedDeveloperOptionsSession(page, "admin-1");
  await mockCommonApi(page, { userId: "admin-1", isAdmin: true, developerOptionsValid: true });

  await page.goto("/inspect");
  await page.getByRole("button", { name: /in-app cam/i }).click();
  await expect(page.getByRole("button", { name: /capture/i })).toBeVisible();

  await expect(page.getByText(/manual camera controls are unavailable on this device\/browser/i)).toBeVisible();
  await expect(page.getByLabel(/focus mode/i)).toHaveCount(0);
});
