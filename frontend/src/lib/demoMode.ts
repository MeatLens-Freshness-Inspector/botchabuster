/**
 * Demo / presentation mode.
 * Set VITE_DEMO_MODE=true in your .env to enable.
 * All API calls are short-circuited and return realistic mock data.
 */

import type { AuthUser, AuthSession } from "@/integrations/api/AuthClient";
import type { Profile } from "@/integrations/api/ProfileClient";
import type { Inspection, AnalysisResult } from "@/types/inspection";
import type { LandingPageStats } from "@/integrations/api/StatsClient";

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

/** Simulates a realistic network delay */
export function demoDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ---------------------------------------------------------------------------
// Demo user / session
// ---------------------------------------------------------------------------

export const DEMO_USER: AuthUser = {
  id: "demo-user-001",
  email: "demo@botchabuster.com",
};

export const DEMO_SESSION: AuthSession = {
  access_token: "demo-token",
  refresh_token: null,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

export const DEMO_PROFILE: Profile = {
  id: "demo-user-001",
  full_name: "Demo Inspector",
  avatar_url: null,
  inspector_code: "DEMO01",
  is_dark_mode: false,
  show_detailed_results: true,
  email: "demo@botchabuster.com",
  location: "Metro Manila, PH",
  created_at: "2026-01-15T08:00:00Z",
  updated_at: "2026-04-28T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Mock inspections
// ---------------------------------------------------------------------------

const BASE = new Date("2026-04-28T10:00:00Z").getTime();
const daysAgo = (d: number) => new Date(BASE - d * 86_400_000).toISOString();

export const DEMO_INSPECTIONS: Inspection[] = [
  {
    id: "demo-insp-001",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "fresh",
    confidence_score: 95,
    flagged_deviations: [],
    explanation: "Excellent freshness. Color and texture profile within optimal range.",
    image_url: null,
    location: "Section A â€“ Stall 3",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
  },
  {
    id: "demo-insp-002",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "acceptable",
    confidence_score: 81,
    flagged_deviations: ["Slight color deviation"],
    explanation: "Sample is within acceptable freshness bounds. Minor color variation detected.",
    image_url: null,
    location: "Section B â€“ Stall 1",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: "demo-insp-003",
    user_id: "demo-user-001",
    meat_type: "beef",
    classification: "fresh",
    confidence_score: 93,
    flagged_deviations: [],
    explanation: "Prime freshness. Vibrant red color with consistent texture.",
    image_url: null,
    location: "Section A â€“ Stall 1",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: "High quality cut",
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: "demo-insp-004",
    user_id: "demo-user-001",
    meat_type: "fish",
    classification: "warning",
    confidence_score: 72,
    flagged_deviations: ["Elevated contrast variance", "Color outside typical range"],
    explanation: "Freshness is borderline. Recommend immediate sale or discard.",
    image_url: null,
    location: "Section C â€“ Stall 2",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: "Arrived late delivery",
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: "demo-insp-005",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "spoiled",
    confidence_score: 97,
    flagged_deviations: ["High contrast variance", "Color severely outside range", "Texture degradation"],
    explanation: "Sample shows clear signs of spoilage. Do not sell.",
    image_url: null,
    location: "Section A â€“ Stall 5",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: "Pulled from shelf",
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: "demo-insp-006",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 91,
    flagged_deviations: [],
    explanation: "Fresh pork sample with excellent color and texture indicators.",
    image_url: null,
    location: "Section B â€“ Stall 3",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
  {
    id: "demo-insp-007",
    user_id: "demo-user-001",
    meat_type: "beef",
    classification: "acceptable",
    confidence_score: 78,
    flagged_deviations: ["Minor texture irregularity"],
    explanation: "Acceptable quality. Sell within 24 hours.",
    image_url: null,
    location: "Section A â€“ Stall 2",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: "demo-insp-008",
    user_id: "demo-user-001",
    meat_type: "fish",
    classification: "fresh",
    confidence_score: 89,
    flagged_deviations: [],
    explanation: "Very fresh. Recommended for immediate display.",
    image_url: null,
    location: "Section C â€“ Stall 1",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: "Morning delivery",
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
  },
  {
    id: "demo-insp-009",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "warning",
    confidence_score: 69,
    flagged_deviations: ["Color approaching threshold"],
    explanation: "Borderline freshness. Monitor closely and sell within hours.",
    image_url: null,
    location: "Section A â€“ Stall 4",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  },
  {
    id: "demo-insp-010",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 0.94,
    flagged_deviations: [],
    explanation: "Fresh and high quality. Good color and texture metrics.",
    image_url: null,
    location: "Section B â€“ Stall 2",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: daysAgo(14),
    updated_at: daysAgo(14),
  },
];

export const DEMO_STATS = {
  total: DEMO_INSPECTIONS.length,
  byClassification: {
    fresh: DEMO_INSPECTIONS.filter((i) => i.classification === "fresh").length,
    acceptable: DEMO_INSPECTIONS.filter((i) => i.classification === "acceptable").length,
    warning: DEMO_INSPECTIONS.filter((i) => i.classification === "warning").length,
    spoiled: DEMO_INSPECTIONS.filter((i) => i.classification === "spoiled").length,
  },
};

// ---------------------------------------------------------------------------
// Mock analysis result (returned when "Analyze" is pressed in demo mode)
// ---------------------------------------------------------------------------

export const DEMO_ANALYSIS_RESULT: AnalysisResult = {
  classification: "fresh",
  confidence_score: 0.93,
  flagged_deviations: [],
  explanation:
    "Sample shows strong freshness indicators with optimal color profile and uniform texture.",
};

// ---------------------------------------------------------------------------
// Landing page stats
// ---------------------------------------------------------------------------

export const DEMO_LANDING_STATS: LandingPageStats = {
  inspectionCount: 1247,
  userCount: 38,
  freshRate: 72,
};

