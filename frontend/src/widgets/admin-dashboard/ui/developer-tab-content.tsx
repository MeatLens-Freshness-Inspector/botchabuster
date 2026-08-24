import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useDeveloperDashboard } from "@/features/developer-tools";
import {
  DeveloperDatasetsSection,
  DeveloperExport,
  DeveloperOverviewSection,
  DeveloperTrainingSection,
  DeveloperDisputesSection,
  ApiDocsSection,
  DeveloperOptionsPanel,
} from "@/features/developer-tools";
import type { DeveloperWorkspaceTabKey } from "@/features/developer-tools";

const DeveloperTabContent = () => {
  const developer = useDeveloperDashboard();

  return (
    <div className="space-y-5">
      <Tabs
        value={developer.activeDeveloperTab}
        onValueChange={(value) => developer.setActiveDeveloperTab(value as DeveloperWorkspaceTabKey)}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-card/90 p-2 md:grid-cols-6">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl">Developer Settings</TabsTrigger>
          <TabsTrigger value="api-docs" className="rounded-xl">API Docs</TabsTrigger>
          <TabsTrigger value="datasets" className="rounded-xl">Datasets</TabsTrigger>
          <TabsTrigger value="training" className="rounded-xl">Training</TabsTrigger>
          <TabsTrigger value="disputes" className="rounded-xl">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <DeveloperOverviewSection
            overview={developer.overview}
            isLoading={developer.isLoadingOverview}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <DeveloperOptionsPanel />
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
        <TabsContent value="disputes" className="mt-5">
          <DeveloperDisputesSection
            disputes={developer.disputes}
            isLoading={developer.isLoadingDisputes}
            onApplyDeveloperLabel={developer.applyDisputeToDeveloperDataset}
            onReview={developer.reviewDispute}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperTabContent;
