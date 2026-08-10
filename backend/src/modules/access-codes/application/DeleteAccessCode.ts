export interface AccessCodeDeleter { delete(id: string): Promise<void>; }
export class DeleteAccessCode {
  constructor(private readonly deleter: AccessCodeDeleter) {}
  execute(id: string): Promise<void> { return this.deleter.delete(id); }
}
