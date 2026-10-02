import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_DEVELOPER_DATASET_FILTERS,
  developerDashboardClient,
  type DeveloperDatasetFilterState,
  type DeveloperDatasetExportHistoryItem,
  type DeveloperDatasetExportProgress,
  type DeveloperDatasetListResponse,
  type DeveloperOverviewResponse,
  type TrainingRunRecord,
} from "@/entities/developer-metrics";
import type { FreshnessClassification } from "@/entities/inspection";
import type { ExportProgress } from "@/shared/lib/use-export-task";
import type { DeveloperWorkspaceTabKey } from "./types";

function formatDatasetExportStage(progress: DeveloperDatasetExportProgress): string {
  switch (progress.stage) {
    case "querying":
      return "Finding matching records...";
    case "downloading-images":
      return "Downloading images...";
    case "assembling-zip":
      return "Assembling ZIP...";
    case "complete":
      return "Download ready";
    default:
      return "Preparing dataset export...";
  }
}

export function downloadDeveloperDatasetUrl(
  url: string,
  filename: string,
): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noreferrer";
  anchor.style.display = "none";
  document.body?.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function useDeveloperDashboard() {
  const [activeDeveloperTab, setActiveDeveloperTab] = useState<DeveloperWorkspaceTabKey>("overview");
  const [overview, setOverview] = useState<DeveloperOverviewResponse | null>(null);
  const [datasets, setDatasets] = useState<DeveloperDatasetListResponse | null>(null);
  const [datasetExports, setDatasetExports] = useState<DeveloperDatasetExportHistoryItem[]>([]);
  const [trainingRuns, setTrainingRuns] = useState<TrainingRunRecord[]>([]);
  const [datasetFilters, setDatasetFilters] = useState<DeveloperDatasetFilterState>(
    DEFAULT_DEVELOPER_DATASET_FILTERS,
  );
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingDatasetExports, setIsLoadingDatasetExports] = useState(false);
  const [datasetExportsLoaded, setDatasetExportsLoaded] = useState(false);
  const [downloadingDatasetExportId, setDownloadingDatasetExportId] = useState<string | null>(null);
  const [isLoadingTrainingRuns, setIsLoadingTrainingRuns] = useState(false);
  const [isExportingDatasets, setIsExportingDatasets] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportStage, setExportStage] = useState<string | null>(null);
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

  const loadDatasetExports = useCallback(async () => {
    setIsLoadingDatasetExports(true);
    try {
      setDatasetExports(await developerDashboardClient.listDatasetExports());
      setDatasetExportsLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dataset export history");
    } finally {
      setIsLoadingDatasetExports(false);
      setDatasetExportsLoaded(true);
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
        void loadOverview();

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
    setExportProgress({ current: 0, total: 1 });
    setExportStage("Starting dataset export...");
    try {
      await developerDashboardClient.exportDatasets(datasetFilters, (progress) => {
        setExportProgress({ current: progress.current, total: progress.total });
        setExportStage(formatDatasetExportStage(progress));
      });
      await loadDatasetExports();
      toast.success("Dataset export is ready in download history");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export developer datasets");
    } finally {
      setIsExportingDatasets(false);
      setExportProgress(null);
      setExportStage(null);
    }
  }, [datasetFilters, loadDatasetExports]);

  const downloadDatasetExport = useCallback(async (exportId: string) => {
    setDownloadingDatasetExportId(exportId);
    try {
      const download = await developerDashboardClient.getDatasetExportDownloadUrl(exportId);
      downloadDeveloperDatasetUrl(download.url, download.filename);
      await loadDatasetExports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download dataset export");
    } finally {
      setDownloadingDatasetExportId(null);
    }
  }, [loadDatasetExports]);

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
    if (activeDeveloperTab === "datasets" && !datasetExportsLoaded && !isLoadingDatasetExports) {
      void loadDatasetExports();
    }
  }, [activeDeveloperTab, datasetExportsLoaded, isLoadingDatasetExports, loadDatasetExports]);

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
    datasetExports,
    trainingRuns,
    datasetFilters,
    setDatasetFilters,
    isLoadingOverview,
    isLoadingDatasets,
    isLoadingDatasetExports,
    isLoadingTrainingRuns,
    isExportingDatasets,
    exportProgress,
    exportStage,
    downloadingDatasetExportId,
    isImportingTrainingRun,
    loadOverview,
    loadDatasets,
    loadDatasetExports,
    loadTrainingRuns,
    updateDatasetManualClassification,
    exportDatasets,
    downloadDatasetExport,
    importTrainingRun,
  };
}
