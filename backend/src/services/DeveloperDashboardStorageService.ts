import { supabase } from "../integrations/supabase";

export class DeveloperDashboardStorageService {
  private static instance: DeveloperDashboardStorageService;
  private readonly bucketName = "inspection-images";
  private readonly trainingPrefix = "developer/training-runs";

  private constructor() {}

  static getInstance(): DeveloperDashboardStorageService {
    if (!DeveloperDashboardStorageService.instance) {
      DeveloperDashboardStorageService.instance = new DeveloperDashboardStorageService();
    }
    return DeveloperDashboardStorageService.instance;
  }

  buildManifestPath(runId: string): string {
    return `${this.trainingPrefix}/${runId}/manifest.json`;
  }

  buildArtifactPath(runId: string, relativePath: string): string {
    return `${this.trainingPrefix}/${runId}/artifacts/${relativePath}`;
  }

  async uploadBuffer(storagePath: string, body: Uint8Array, contentType: string): Promise<void> {
    const { error } = await supabase.storage.from(this.bucketName).upload(storagePath, body, {
      contentType,
      upsert: false,
    });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  async downloadText(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(this.bucketName).download(storagePath);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return await data.text();
  }

  async listTrainingRunIds(): Promise<string[]> {
    const { data, error } = await supabase.storage.from(this.bucketName).list(this.trainingPrefix, {
      limit: 200,
      offset: 0,
      sortBy: { column: "name", order: "desc" },
    });

    if (error) throw new Error(`Storage list failed: ${error.message}`);

    return (data ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0 && !name.includes("."));
  }
}

export const developerDashboardStorageService = DeveloperDashboardStorageService.getInstance();
