import { createAuthHeaders } from "@/lib/authCache";
import type { Inspection } from "@/types/inspection";
import { readApiErrorMessage } from "./apiRequest";
import { fetchWithTimeout, UPLOAD_REQUEST_TIMEOUT_MS } from "./fetchWithTimeout";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";
const LONG_RUNNING_REQUEST_TIMEOUT_MS = 120_000;

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

export interface DeveloperOverviewResponse {
  highlightedFamilies: {
    mobilenetv2: DeveloperOverviewMetricPoint | null;
    mobilenetv3: DeveloperOverviewMetricPoint | null;
  };
  latestRuns: DeveloperOverviewMetricPoint[];
}

export interface DeveloperDatasetFilterState {
  limit: number;
  offset: number;
  meatType: string;
  classification: string;
  inspector: string;
  location: string;
  hasImage: boolean | null;
  dateFrom: string;
  dateTo: string;
}

export interface DeveloperDatasetListResponse {
  items: Inspection[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrainingRunRecord {
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
  manifestPath: string;
  artifactPaths: string[];
}

export const DEFAULT_DEVELOPER_DATASET_FILTERS: DeveloperDatasetFilterState = {
  limit: 25,
  offset: 0,
  meatType: "",
  classification: "",
  inspector: "",
  location: "",
  hasImage: null,
  dateFrom: "",
  dateTo: "",
};

function createDatasetSearchParams(filters: DeveloperDatasetFilterState, offset = filters.offset): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(filters.limit),
    offset: String(offset),
  });

  if (filters.meatType.trim()) params.set("meatType", filters.meatType.trim());
  if (filters.classification.trim()) params.set("classification", filters.classification.trim());
  if (filters.inspector.trim()) params.set("inspector", filters.inspector.trim());
  if (filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.hasImage !== null) params.set("hasImage", String(filters.hasImage));
  if (filters.dateFrom.trim()) params.set("dateFrom", filters.dateFrom.trim());
  if (filters.dateTo.trim()) params.set("dateTo", filters.dateTo.trim());

  return params;
}

function createDatasetExportPayload(filters: DeveloperDatasetFilterState): Record<string, unknown> {
  return Object.fromEntries(createDatasetSearchParams(filters, 0).entries());
}

export class DeveloperDashboardClient {
  private static instance: DeveloperDashboardClient;

  private constructor() {}

  static getInstance(): DeveloperDashboardClient {
    if (!DeveloperDashboardClient.instance) {
      DeveloperDashboardClient.instance = new DeveloperDashboardClient();
    }
    return DeveloperDashboardClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  async getOverview(): Promise<DeveloperOverviewResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/developer-dashboard/overview`, {
      headers: this.createHeaders(),
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Failed to fetch developer overview"));
    }

    return response.json();
  }

  async getDatasets(filters: DeveloperDatasetFilterState, offset = filters.offset): Promise<DeveloperDatasetListResponse> {
    const params = createDatasetSearchParams(filters, offset);
    const response = await fetchWithTimeout(`${API_BASE_URL}/developer-dashboard/datasets?${params.toString()}`, {
      headers: this.createHeaders(),
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Failed to fetch developer datasets"));
    }

    return response.json();
  }

  async exportDatasets(filters: DeveloperDatasetFilterState): Promise<Blob> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/developer-dashboard/datasets/export`,
      {
        method: "POST",
        headers: this.createHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(createDatasetExportPayload(filters)),
      },
      LONG_RUNNING_REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Failed to export developer datasets"));
    }

    return response.blob();
  }

  async listTrainingRuns(): Promise<TrainingRunRecord[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/developer-dashboard/training-runs`, {
      headers: this.createHeaders(),
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Failed to fetch training runs"));
    }

    return response.json();
  }

  async importTrainingRun(file: File): Promise<TrainingRunRecord> {
    const formData = new FormData();
    formData.append("package", file);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/developer-dashboard/training-runs/import`,
      {
        method: "POST",
        headers: this.createHeaders(),
        body: formData,
      },
      LONG_RUNNING_REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Failed to import training run"));
    }

    return response.json();
  }
}

export const developerDashboardClient = DeveloperDashboardClient.getInstance();
