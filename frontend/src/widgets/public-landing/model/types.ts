import type { LucideIcon } from "lucide-react";

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
  result: string;
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

export type LandingTestimonial = {
  name: string;
  quote: string;
  rating: number;
  role: string;
};

export type LandingMockSample = {
  border: string;
  color: string;
  conf: number;
  icon: LucideIcon;
  id: string;
  label: string;
  text: string;
  textCol: string;
  type: string;
};
