import type { MarketLocation } from "../infrastructure/MarketLocationService";
export interface MarketLocationCreator { create(name: string): Promise<MarketLocation>; }
export class CreateMarketLocation {
  constructor(private readonly creator: MarketLocationCreator) {}
  execute(name: string): Promise<MarketLocation> { return this.creator.create(name); }
}
