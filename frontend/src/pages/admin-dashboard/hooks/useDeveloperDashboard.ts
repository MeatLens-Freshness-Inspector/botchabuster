import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_DEVELOPER_DATASET_FILTERS,
  developerDashboardClient,
  type DeveloperDatasetFilterState,
  type DeveloperDatasetListResponse,
  type DeveloperOverviewResponse,
  type TrainingRunRecord,
} from "@/integrations/api/DeveloperDashboardClient";
import type { FreshnessClassification } from "@/types/inspection";
import type { DeveloperWorkspaceTabKey } from "../types";

export function useDeveloperDashboard() {
  const [activeDeveloperTab, setActiveDeveloperTab] = useState<DeveloperWorkspaceTabKey>("overview");
  const [overview, setOverview] = useState<DeveloperOverviewResponse | null>(null);
  const [datasets, setDatasets] = useState<DeveloperDatasetListResponse | null>(null);
  const [trainingRuns, setTrainingRuns] = useState<TrainingRunRecord[]>([]);
  const [datasetFilters, setDatasetFilters] = useState<DeveloperDatasetFilterState>(
    DEFAULT_DEVELOPER_DATASET_FILTERS,
  );
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingTrainingRuns, setIsLoadingTrainingRuns] = useState(false);
  const [isExportingDatasets, setIsExportingDatasets] = useState(false);
  const [isImportingTrainingRun, setIsImportingTrainingRun] = useState(false);

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      setOverview(await developerDashboardClient.getOverview());
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

        return updatedInspection;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update developer dataset classification");
        throw error;
      }
    },
    [],
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
    if (activeDeveloperTab === "overview" && !overview && !isLoadingOverview) {
      void loadOverview();
    }
  }, [activeDeveloperTab, isLoadingOverview, loadOverview, overview]);

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

  return {
    activeDeveloperTab,
    setActiveDeveloperTab,
    overview,
    datasets,
    trainingRuns,
    datasetFilters,
    setDatasetFilters,
    isLoadingOverview,
    isLoadingDatasets,
    isLoadingTrainingRuns,
    isExportingDatasets,
    isImportingTrainingRun,
    loadOverview,
    loadDatasets,
    loadTrainingRuns,
    updateDatasetManualClassification,
    exportDatasets,
    importTrainingRun,
  };
}
