import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { marketLocationClient, normalizeMarketName, type MarketLocation } from "@/entities/market-location";

interface UseMarketFormOptions {
  marketLocations: MarketLocation[];
  setMarketLocations: Dispatch<SetStateAction<MarketLocation[]>>;
}

export function useMarketForm({ marketLocations, setMarketLocations }: UseMarketFormOptions) {
  const [newMarketName, setNewMarketName] = useState("");

  const handleCreateMarket = async () => {
    const normalizedName = normalizeMarketName(newMarketName);
    if (!normalizedName) {
      toast.error("Market name cannot be empty");
      return;
    }

    if (marketLocations.some((market) => market.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0)) {
      toast.error("Market already exists");
      return;
    }

    try {
      const created = await marketLocationClient.create(normalizedName);
      setMarketLocations((previous) => [...previous, created].sort((left, right) => left.name.localeCompare(right.name)));
      setNewMarketName("");
      toast.success("Market added");
    } catch {
      toast.error("Failed to add market");
    }
  };

  return { handleCreateMarket, newMarketName, setNewMarketName };
}
