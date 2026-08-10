import type { MarketLocation } from "../infrastructure/MarketLocationService";
export interface MarketLocationReader { getAll(): Promise<MarketLocation[]>; }
export class ListMarketLocations {
  constructor(private readonly reader: MarketLocationReader) {}
  execute(): Promise<MarketLocation[]> { return this.reader.getAll(); }
}
