import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_DEVELOPER_DATASET_FILTERS,
  developerDashboardClient,
  type DeveloperDatasetFilterState,
  type DeveloperDatasetListResponse,
  type DeveloperOverviewResponse,
  type TrainingRunRecord,
  type DeveloperDisputeMutationResponse,
} from "@/entities/developer-metrics";
import type { FreshnessClassification, Inspection, InspectionResultDispute } from "@/entities/inspection";
import { buildDeveloperInAppMetrics } from "../lib/in-app-metrics";
import type { DeveloperWorkspaceTabKey } from "./types";

const OVERVIEW_DATASET_FILTERS: DeveloperDatasetFilterState = {
  ...DEFAULT_DEVELOPER_DATASET_FILTERS,
  limit: 10_000,
  offset: 0,
};

export function useDeveloperDashboard() {
  const [activeDeveloperTab, setActiveDeveloperTab] = useState<DeveloperWorkspaceTabKey>("overview");
  const [overview, setOverview] = useState<DeveloperOverviewResponse | null>(null);
  const [datasets, setDatasets] = useState<DeveloperDatasetListResponse | null>(null);
  const [overviewDatasetItems, setOverviewDatasetItems] = useState<Inspection[] | null>(null);
  const [trainingRuns, setTrainingRuns] = useState<TrainingRunRecord[]>([]);
  const [disputes, setDisputes] = useState<InspectionResultDispute[]>([]);
  const [datasetFilters, setDatasetFilters] = useState<DeveloperDatasetFilterState>(
    DEFAULT_DEVELOPER_DATASET_FILTERS,
  );
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingTrainingRuns, setIsLoadingTrainingRuns] = useState(false);
  const [isExportingDatasets, setIsExportingDatasets] = useState(false);
  const [isImportingTrainingRun, setIsImportingTrainingRun] = useState(false);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(false);

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const [overviewResponse, overviewDatasetPage] = await Promise.all([
        developerDashboardClient.getOverview(),
        developerDashboardClient.getDatasets(OVERVIEW_DATASET_FILTERS, 0),
      ]);
      setOverviewDatasetItems(overviewDatasetPage.items);
      setOverview({
        ...overviewResponse,
        inAppMetrics: buildDeveloperInAppMetrics(overviewDatasetPage.items),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load developer overview");
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  const loadDatasets = useCallback(async (nextOffset = datasetFilters.offset) => {
    setIsLoadingDatasets(true);
    try {
      const page = await developerDashboardClient.getDatasets(datasetFilters, nextOffset);
      setDatasets(page);
      setDatasetFilters((current) => ({ ...current, offset: page.offset }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load developer datasets");
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [datasetFilters]);

  const loadTrainingRuns = useCallback(async () => {
    setIsLoadingTrainingRuns(true);
    try {
      setTrainingRuns(await developerDashboardClient.listTrainingRuns());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load training runs");
    } finally {
      setIsLoadingTrainingRuns(false);
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    setIsLoadingDisputes(true);
    try {
      setDisputes(await developerDashboardClient.listInspectionResultDisputes());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load inspection disputes");
    } finally {
      setIsLoadingDisputes(false);
    }
  }, []);

  const applyDisputeToDeveloperDataset = useCallback(async (disputeId: string): Promise<DeveloperDisputeMutationResponse> => {
    try {
      const result = await developerDashboardClient.applyInspectionDisputeToDeveloperDataset(disputeId);
      setDisputes((current) => current.filter((item) => item.id !== disputeId));
      toast.success("Developer dataset label applied");
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply developer label");
      throw error;
    }
  }, []);

  const reviewDispute = useCallback(async (
    disputeId: string,
    decision: "approved" | "rejected",
    reviewerNote: string | null,
  ): Promise<DeveloperDisputeMutationResponse> => {
    try {
      const result = await developerDashboardClient.reviewInspectionResultDispute(disputeId, decision, reviewerNote);
      setDisputes((current) => current.filter((item) => item.id !== disputeId));
      toast.success(`Dispute ${decision}`);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${decision} dispute`);
      throw error;
    }
  }, []);

  const updateDatasetManualClassification = useCallback(
    async (inspectionId: string, classification: FreshnessClassification) => {
      try {
        const updatedInspection = await developerDashboardClient.updateDatasetManualClassification(
          inspectionId,
          classification,
        );

        setDatasets((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === inspectionId ? updatedInspection : item)),
              }
            : current,
        );
        setOverviewDatasetItems((current) => {
          if (!current) {
            return current;
          }

          const nextItems = current.map((item) => (item.id === inspectionId ? updatedInspection : item));
          setOverview((currentOverview) => (
            currentOverview
              ? {
                  ...currentOverview,
                  inAppMetrics: buildDeveloperInAppMetrics(nextItems),
                }
              : currentOverview
          ));
          return nextItems;
        });

        return updatedInspection;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update developer dataset classification");
        throw error;
      }
    },
    [loadOverview],
  );

  const exportDatasets = useCallback(async () => {
    setIsExportingDatasets(true);
    try {
      const blob = await developerDashboardClient.exportDatasets(datasetFilters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `developer-dataset-${Date.now()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Dataset export started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export developer datasets");
    } finally {
      setIsExportingDatasets(false);
    }
  }, [datasetFilters]);

  const importTrainingRun = useCallback(async (file: File) => {
    setIsImportingTrainingRun(true);
    try {
      const run = await developerDashboardClient.importTrainingRun(file);
      setTrainingRuns((currentRuns) => [run, ...currentRuns.filter((currentRun) => currentRun.runId !== run.runId)]);
      toast.success("Training run imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import training run");
    } finally {
      setIsImportingTrainingRun(false);
    }
  }, []);

  useEffect(() => {
    if (activeDeveloperTab === "overview") {
      void loadOverview();
    }
  }, [activeDeveloperTab, loadOverview]);

  useEffect(() => {
    if (activeDeveloperTab === "datasets" && !datasets && !isLoadingDatasets) {
      void loadDatasets();
    }
  }, [activeDeveloperTab, datasets, isLoadingDatasets, loadDatasets]);

  useEffect(() => {
    if (activeDeveloperTab === "training" && trainingRuns.length === 0 && !isLoadingTrainingRuns) {
      void loadTrainingRuns();
    }
  }, [activeDeveloperTab, isLoadingTrainingRuns, loadTrainingRuns, trainingRuns.length]);

  useEffect(() => {
    if (activeDeveloperTab === "disputes" && disputes.length === 0 && !isLoadingDisputes) {
      void loadDisputes();
    }
  }, [activeDeveloperTab, disputes.length, isLoadingDisputes, loadDisputes]);

  return {
    activeDeveloperTab,
    setActiveDeveloperTab,
    overview,
    datasets,
    trainingRuns,
    disputes,
    datasetFilters,
    setDatasetFilters,
    isLoadingOverview,
    isLoadingDatasets,
    isLoadingTrainingRuns,
    isExportingDatasets,
    isImportingTrainingRun,
    isLoadingDisputes,
    loadOverview,
    loadDatasets,
    loadTrainingRuns,
    loadDisputes,
    updateDatasetManualClassification,
    exportDatasets,
    importTrainingRun,
    applyDisputeToDeveloperDataset,
    reviewDispute,
  };
}
