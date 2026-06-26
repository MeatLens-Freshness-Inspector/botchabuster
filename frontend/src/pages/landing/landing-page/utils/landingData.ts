import {
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type {
  LandingFeature,
  LandingMockSample,
  LandingTestimonial,
  LandingWorkflowStep,
  TickerItem,
} from "../../types";

export const tickerItems: TickerItem[] = [
  { id: "t1", label: "Pork Shoulder", result: "Fresh", conf: 91, market: "Divisoria Wet Mkt", textCol: "text-fresh" },
  { id: "t2", label: "Chicken Breast", result: "Acceptable", conf: 76, market: "Caloocan Public Mkt", textCol: "text-acceptable" },
  { id: "t3", label: "Beef Brisket", result: "Fresh", conf: 95, market: "Pasig Market", textCol: "text-fresh" },
  { id: "t4", label: "Bangus Fillet", result: "Warning", conf: 43, market: "Quiapo Market", textCol: "text-warning" },
  { id: "t5", label: "Pork Liempo", result: "Fresh", conf: 89, market: "SM Fairview", textCol: "text-fresh" },
  { id: "t6", label: "Chicken Thigh", result: "Spoiled", conf: 9, market: "Balintawak Market", textCol: "text-spoiled" },
  { id: "t7", label: "Beef Tenderloin", result: "Acceptable", conf: 74, market: "Cubao Farmers", textCol: "text-acceptable" },
  { id: "t8", label: "Tilapia Whole", result: "Fresh", conf: 92, market: "Las Piñas City Mkt", textCol: "text-fresh" },
];

export const landingFeatures: LandingFeature[] = [
  {
    icon: Camera,
    title: "Computer Vision Capture",
    desc: "Capture meat samples on-site and run confidence-based freshness classification in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Food Safety Standard Alignment",
    desc: "Classify every sample against health-guided freshness indicators with a consistent decision framework.",
  },
  {
    icon: BarChart3,
    title: "Actionable Record History",
    desc: "Track inspections over time with confidence trends and searchable evidence.",
  },
  {
    icon: Zap,
    title: "Built for Field Speed",
    desc: "Optimized mobile-first workflow for wet market environments where quick decisions matter.",
  },
];

export const landingWorkflow: LandingWorkflowStep[] = [
  { icon: Camera, title: "Capture", desc: "Take or upload sample photo" },
  { icon: Cpu, title: "Analyze", desc: "Run model and rules checks" },
  { icon: CheckCircle2, title: "Classify", desc: "Get freshness category + confidence" },
  { icon: ClipboardCheck, title: "Record", desc: "Save official inspection log" },
];

export const landingTestimonials: LandingTestimonial[] = [
  {
    name: "Maria Santos",
    role: "Barangay Health Inspector",
    quote: "MeatLens helped us standardize inspections. It is easier to explain findings when you have objective values.",
    rating: 5,
  },
  {
    name: "Carlos Reyes",
    role: "Municipal Food Safety Officer",
    quote: "The app catches subtle quality issues that pure visual checks can miss, especially in crowded market shifts.",
    rating: 5,
  },
  {
    name: "Ana Dela Cruz",
    role: "Wet Market Inspector",
    quote: "Simple mobile flow, fast analysis, and clean records. It made our daily inspection routine much smoother.",
    rating: 4,
  },
];

export const landingMockSamples: LandingMockSample[] = [
  {
    id: "fresh",
    label: "Prime Beef Cut",
    type: "Fresh",
    color: "bg-fresh",
    border: "border-fresh/50",
    textCol: "text-fresh",
    conf: 94,
    icon: ShieldCheck,
    text: "Safe to Sell",
  },
  {
    id: "acceptable",
    label: "Standard Pork",
    type: "Acceptable",
    color: "bg-acceptable",
    border: "border-acceptable/50",
    textCol: "text-acceptable",
    conf: 78,
    icon: CheckCircle2,
    text: "Passes Inspection",
  },
  {
    id: "warning",
    label: "Questionable Poultry",
    type: "Warning",
    color: "bg-warning",
    border: "border-warning/50",
    textCol: "text-warning",
    conf: 45,
    icon: Zap,
    text: "Requires Attention",
  },
  {
    id: "spoiled",
    label: "Discarded Sample",
    type: "Spoiled",
    color: "bg-spoiled",
    border: "border-spoiled/50",
    textCol: "text-spoiled",
    conf: 12,
    icon: AlertTriangle,
    text: "WARNING: Spoiled",
  },
];
