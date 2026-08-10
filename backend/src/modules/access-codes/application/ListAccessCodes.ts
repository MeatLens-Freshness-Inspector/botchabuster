import type { AccessCode } from "../infrastructure/AccessCodeService";
export interface AccessCodeReader { getAll(): Promise<AccessCode[]>; }
export class ListAccessCodes {
  constructor(private readonly reader: AccessCodeReader) {}
  execute(): Promise<AccessCode[]> { return this.reader.getAll(); }
}
