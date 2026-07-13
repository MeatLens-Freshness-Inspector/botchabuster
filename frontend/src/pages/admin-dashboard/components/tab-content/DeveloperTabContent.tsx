import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeveloperDashboard } from "../../hooks/useDeveloperDashboard";
import type { DeveloperWorkspaceTabKey } from "../../types";
import { DeveloperDatasetsSection } from "../developer/DeveloperDatasetsSection";
import { DeveloperOverviewSection } from "../developer/DeveloperOverviewSection";
import { DeveloperSettingsSection } from "../developer/DeveloperSettingsSection";
import { DeveloperTrainingSection } from "../developer/DeveloperTrainingSection";

const DeveloperTabContent = () => {
  const developer = useDeveloperDashboard();

  return (
    <div className="space-y-5">
      <Tabs
        value={developer.activeDeveloperTab}
        onValueChange={(value) => developer.setActiveDeveloperTab(value as DeveloperWorkspaceTabKey)}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-card/90 p-2 md:grid-cols-4">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl">Developer Settings</TabsTrigger>
          <TabsTrigger value="datasets" className="rounded-xl">Datasets</TabsTrigger>
          <TabsTrigger value="training" className="rounded-xl">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <DeveloperOverviewSection
            overview={developer.overview}
            isLoading={developer.isLoadingOverview}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <DeveloperSettingsSection />
        </TabsContent>
        <TabsContent value="datasets" className="mt-5">
          <DeveloperDatasetsSection
            datasets={developer.datasets}
            filters={developer.datasetFilters}
            onFiltersChange={developer.setDatasetFilters}
            onPageChange={developer.loadDatasets}
            onExport={developer.exportDatasets}
            isExporting={developer.isExportingDatasets}
            isLoading={developer.isLoadingDatasets}
          />
        </TabsContent>
        <TabsContent value="training" className="mt-5">
          <DeveloperTrainingSection
            trainingRuns={developer.trainingRuns}
            onImport={developer.importTrainingRun}
            isImporting={developer.isImportingTrainingRun}
            isLoading={developer.isLoadingTrainingRuns}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperTabContent;
