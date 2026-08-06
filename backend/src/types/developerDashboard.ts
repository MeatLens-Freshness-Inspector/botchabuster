import type { Inspection } from "./inspection";

export interface DeveloperOverviewMetricPoint {
  runId: string;
  createdAt: string;
  modelFamily: string;
  modelVariant: string;
  modelVersion: string;
  datasetName: string;
  datasetRecordCount: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface InAppClassBreakdown {
  class: string;
  modelIdentifiedCount: number;
  actualCount: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface InAppMeatTypeBreakdown {
  meatType: string;
  totalCount: number;
  correctCount: number;
  accuracy: number;
}

export interface InAppModelMetrics {
  totalEvaluated: number;
  correctlyIdentified: number;
  incorrectlyIdentified: number;
  inAppAccuracy: number;
  inAppPrecision: number;
  inAppRecall: number;
  inAppF1Score: number;
  classBreakdown: InAppClassBreakdown[];
  meatTypeBreakdown: InAppMeatTypeBreakdown[];
}

export interface DeveloperOverviewResponse {
  highlightedFamilies: {
    mobilenetv2: DeveloperOverviewMetricPoint | null;
    mobilenetv3: DeveloperOverviewMetricPoint | null;
  };
  latestRuns: DeveloperOverviewMetricPoint[];
  inAppMetrics: InAppModelMetrics;
}

export interface DeveloperDatasetFilters {
  limit: number;
  offset: number;
  meatType?: string;
  classification?: string;
  inspector?: string;
  location?: string;
  hasImage?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export type DeveloperDatasetClassification = Inspection["classification"];

export interface DeveloperDatasetListResponse {
  items: Inspection[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrainingRunManifest {
  runId: string;
  createdAt: string;
  modelFamily: string;
  modelVariant: string;
  modelVersion: string;
  datasetName: string;
  datasetRecordCount: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  notes?: string;
  artifactDescriptors?: Array<{ path: string; label: string }>;
}

export interface TrainingRunRecord extends TrainingRunManifest {
  manifestPath: string;
  artifactPaths: string[];
}

export interface DatasetExportManifest {
  exportedAt: string;
  filters: DeveloperDatasetFilters;
  totalRecordCount: number;
  exportedRecordCount: number;
  imageCount: number;
  rowsMissingImages: string[];
}
