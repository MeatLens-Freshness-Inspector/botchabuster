import { supabase } from "../../../integrations/supabase";

export interface MarketLocation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export class MarketLocationService {
  private static instance: MarketLocationService;
  private readonly tableName = "market_locations";

  private constructor() {}

  static getInstance(): MarketLocationService {
    if (!MarketLocationService.instance) {
      MarketLocationService.instance = new MarketLocationService();
    }
    return MarketLocationService.instance;
  }

  async getAll(): Promise<MarketLocation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("id, name, created_at, updated_at")
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .limit(2_000);

    if (error) throw new Error(`Failed to fetch market locations: ${error.message}`);
    return (data as unknown as MarketLocation[]) ?? [];
  }

  async create(name: string): Promise<MarketLocation> {
    const normalizedName = this.normalizeName(name);
    if (!normalizedName) {
      throw new Error("Market location name is required");
    }

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert({ name: normalizedName })
      .select()
      .single();

    if (error) throw new Error(`Failed to create market location: ${error.message}`);
    return data as unknown as MarketLocation;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete market location: ${error.message}`);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }
}

export const marketLocationService = MarketLocationService.getInstance();
