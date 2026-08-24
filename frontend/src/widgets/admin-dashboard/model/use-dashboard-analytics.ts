import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import type { Profile } from "@/entities/user/api";
import { getEffectiveInspectionClassification } from "@/entities/inspection";
import type { Inspection } from "@/entities/inspection";
import {
  ANALYTICS_DAYS,
  MAX_ANALYTICS_ITEMS,
  MEAT_TYPE_LABELS,
  getInspectorLabel,
  getLocationLabel,
} from "../lib/dashboard";

export function useDashboardAnalytics(
  inspections: Inspection[],
  profiles: Profile[],
) {
  const classificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((inspection) => {
      const classification = getEffectiveInspectionClassification(inspection);
      counts[classification] = (counts[classification] || 0) + 1;
    });
    return counts;
  }, [inspections]);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const dailyAnalytics = useMemo(() => {
    const buckets = new Map<
      string,
      {
        date: string;
        count: number;
        totalConfidence: number;
        fresh: number;
        notFresh: number;
        acceptable: number;
        warning: number;
        spoiled: number;
      }
    >();
    const orderedKeys: string[] = [];

    for (let index = ANALYTICS_DAYS - 1; index >= 0; index -= 1) {
      const day = startOfDay(subDays(new Date(), index));
      const key = format(day, "yyyy-MM-dd");
      orderedKeys.push(key);
      buckets.set(key, {
        date: format(day, "MMM d"),
        count: 0,
        totalConfidence: 0,
        fresh: 0,
        notFresh: 0,
        acceptable: 0,
        warning: 0,
        spoiled: 0,
      });
    }

    inspections.forEach((inspection) => {
      const key = format(startOfDay(new Date(inspection.created_at)), "yyyy-MM-dd");
      const bucket = buckets.get(key);
      if (!bucket) return;

      bucket.count += 1;
      bucket.totalConfidence += inspection.confidence_score;

      switch (getEffectiveInspectionClassification(inspection)) {
        case "fresh":
          bucket.fresh += 1;
          break;
        case "not fresh":
          bucket.notFresh += 1;
          break;
        case "acceptable":
          bucket.acceptable += 1;
          break;
        case "warning":
          bucket.warning += 1;
          break;
        case "spoiled":
          bucket.spoiled += 1;
          break;
      }
    });

    return orderedKeys.map((key) => {
      const bucket = buckets.get(key)!;
      return {
        date: bucket.date,
        count: bucket.count,
        fresh: bucket.fresh,
        notFresh: bucket.notFresh,
        acceptable: bucket.acceptable,
        warning: bucket.warning,
        spoiled: bucket.spoiled,
        confidence: bucket.count > 0 ? Math.round(bucket.totalConfidence / bucket.count) : 0,
      };
    });
  }, [inspections]);

  const dailyInspections = useMemo(
    () => dailyAnalytics.map(({ date, count, fresh, spoiled }) => ({ date, count, fresh, spoiled })),
    [dailyAnalytics],
  );

  const inspectorAnalytics = useMemo(() => {
    const aggregates = new Map<string, { inspector: string; count: number; totalConfidence: number }>();

    inspections.forEach((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const inspector = getInspectorLabel(profile);
      const current = aggregates.get(inspector) ?? { inspector, count: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += inspection.confidence_score;
      aggregates.set(inspector, current);
    });

    return Array.from(aggregates.values())
      .sort((left, right) => right.count - left.count || right.totalConfidence - left.totalConfidence || left.inspector.localeCompare(right.inspector))
      .slice(0, MAX_ANALYTICS_ITEMS)
      .map((entry) => ({
        inspector: entry.inspector,
        count: entry.count,
        confidence: Math.round(entry.totalConfidence / entry.count),
      }));
  }, [inspections, profileById]);

  const meatTypeAnalytics = useMemo(() => {
    const aggregates = new Map<keyof typeof MEAT_TYPE_LABELS, { count: number; spoiled: number }>();

    inspections.forEach((inspection) => {
      const key = inspection.meat_type as keyof typeof MEAT_TYPE_LABELS;
      const current = aggregates.get(key) ?? { count: 0, spoiled: 0 };
      current.count += 1;
      if (getEffectiveInspectionClassification(inspection) === "spoiled") current.spoiled += 1;
      aggregates.set(key, current);
    });

    return (Object.entries(MEAT_TYPE_LABELS) as Array<[keyof typeof MEAT_TYPE_LABELS, string]>)
      .map(([key, label]) => {
        const entry = aggregates.get(key) ?? { count: 0, spoiled: 0 };
        return {
          meatType: label,
          count: entry.count,
          spoiledRate: entry.count > 0 ? Math.round((entry.spoiled / entry.count) * 100) : 0,
        };
      })
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.meatType.localeCompare(right.meatType));
  }, [inspections]);

  const locationAnalytics = useMemo(() => {
    const aggregates = new Map<string, { location: string; count: number; spoiled: number }>();

    inspections.forEach((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const location = getLocationLabel(inspection.location, profile);
      const current = aggregates.get(location) ?? { location, count: 0, spoiled: 0 };
      current.count += 1;
      if (getEffectiveInspectionClassification(inspection) === "spoiled") current.spoiled += 1;
      aggregates.set(location, current);
    });

    return Array.from(aggregates.values())
      .sort((left, right) => right.count - left.count || right.spoiled - left.spoiled || left.location.localeCompare(right.location))
      .slice(0, MAX_ANALYTICS_ITEMS)
      .map((entry) => ({
        location: entry.location,
        count: entry.count,
        spoiledRate: entry.count > 0 ? Math.round((entry.spoiled / entry.count) * 100) : 0,
      }));
  }, [inspections, profileById]);

  const confidenceTrendData = useMemo(
    () => dailyAnalytics.map(({ date, confidence }) => ({ date, confidence })),
    [dailyAnalytics],
  );

  const freshnessMixData = useMemo(
    () => dailyAnalytics.map(({ date, fresh, notFresh, acceptable, warning, spoiled }) => ({
      date,
      fresh,
      notFresh,
      acceptable,
      warning,
      spoiled,
    })),
    [dailyAnalytics],
  );

  return {
    classificationCounts,
    profileById,
    dailyInspections,
    inspectorAnalytics,
    meatTypeAnalytics,
    locationAnalytics,
    confidenceTrendData,
    freshnessMixData,
  };
}
