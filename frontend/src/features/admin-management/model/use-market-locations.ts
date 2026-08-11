import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { marketLocationClient, type MarketLocation } from "@/entities/market-location";

interface UseMarketLocationsOptions {
  marketLocations: MarketLocation[];
  setMarketLocations: Dispatch<SetStateAction<MarketLocation[]>>;
}

export function useMarketLocations({ marketLocations, setMarketLocations }: UseMarketLocationsOptions) {
  const [pendingDeleteMarketId, setPendingDeleteMarketId] = useState<string | null>(null);

  const handleDeleteMarket = async (id: string) => {
    if (marketLocations.length <= 1) {
      toast.error("At least one market location is required");
      return;
    }
    setPendingDeleteMarketId(id);
  };

  const confirmDeleteMarket = async () => {
    const id = pendingDeleteMarketId;
    if (!id) return;
    setPendingDeleteMarketId(null);

    try {
      await marketLocationClient.delete(id);
      setMarketLocations((previous) => previous.filter((market) => market.id !== id));
      toast.success("Market removed");
    } catch {
      toast.error("Failed to remove market");
    }
  };

  return { confirmDeleteMarket, handleDeleteMarket, pendingDeleteMarketId, setPendingDeleteMarketId };
}
