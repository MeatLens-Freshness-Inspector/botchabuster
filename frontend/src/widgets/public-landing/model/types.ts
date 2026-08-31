import type { LucideIcon } from "lucide-react";
import type { MeatType } from "@/entities/inspection";

export type AnimatedStatData = {
  label: string;
  rawValue: number;
  suffix?: string;
};

export type TickerItem = {
  conf: number;
  id: string;
  label: string;
  market: string;
  meatType: MeatType;
  result: string;
  scopeLabel: string | null;
  textCol: string;
};

export type LandingFeature = {
  desc: string;
  icon: LucideIcon;
  title: string;
};

export type LandingWorkflowStep = {
  desc: string;
  icon: LucideIcon;
  title: string;
};

export type LandingMockSample = {
  border: string;
  color: string;
  conf: number;
  icon: LucideIcon;
  id: string;
  label: string;
  meatType: MeatType;
  scopeLabel: string | null;
  text: string;
  textCol: string;
  type: string;
};
