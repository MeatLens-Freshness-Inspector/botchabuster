import type { StorageService } from "../infrastructure/StorageService";
export class UploadInspectionImage {
  constructor(private readonly storage: Pick<StorageService, "uploadInspectionImage">) {}
  execute(input: { filePath: string; userId: string; originalName: string }): Promise<string> {
    return this.storage.uploadInspectionImage(input.filePath, input.userId, input.originalName);
  }
}
