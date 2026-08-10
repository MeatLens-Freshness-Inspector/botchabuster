export interface MarketLocationDeleter { delete(id: string): Promise<void>; }
export class DeleteMarketLocation {
  constructor(private readonly deleter: MarketLocationDeleter) {}
  execute(id: string): Promise<void> { return this.deleter.delete(id); }
}
