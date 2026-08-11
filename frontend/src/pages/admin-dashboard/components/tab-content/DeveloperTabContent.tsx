import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useDeveloperDashboard } from "@/features/developer-tools";
import { DeveloperExport, DeveloperOverviewSection } from "@/features/developer-tools";
import type { DeveloperWorkspaceTabKey } from "@/widgets/admin-dashboard";
import { DeveloperDatasetsSection } from "../developer/DeveloperDatasetsSection";
import { DeveloperSettingsSection } from "../developer/DeveloperSettingsSection";
import { DeveloperTrainingSection } from "../developer/DeveloperTrainingSection";
import { ApiDocsSection } from "../developer/api-docs/ApiDocsSection";

const DeveloperTabContent = () => {
  const developer = useDeveloperDashboard();

  return (
    <div className="space-y-5">
      <Tabs
        value={developer.activeDeveloperTab}
        onValueChange={(value) => developer.setActiveDeveloperTab(value as DeveloperWorkspaceTabKey)}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-card/90 p-2 md:grid-cols-5">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl">Developer Settings</TabsTrigger>
          <TabsTrigger value="api-docs" className="rounded-xl">API Docs</TabsTrigger>
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
        <TabsContent value="api-docs" className="mt-5">
          <ApiDocsSection />
        </TabsContent>
        <TabsContent value="datasets" className="mt-5">
          <DeveloperExport>
          <DeveloperDatasetsSection
            datasets={developer.datasets}
            filters={developer.datasetFilters}
            onFiltersChange={developer.setDatasetFilters}
            onManualClassificationChange={developer.updateDatasetManualClassification}
            onPageChange={developer.loadDatasets}
            onExport={developer.exportDatasets}
            isExporting={developer.isExportingDatasets}
            isLoading={developer.isLoadingDatasets}
          />
          </DeveloperExport>
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
