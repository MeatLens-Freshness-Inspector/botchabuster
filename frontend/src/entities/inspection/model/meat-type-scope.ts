import type { MeatType } from "./types";

export type MeatTypeScope = "validated" | "future";

const VALIDATED_MEAT_TYPES = new Set<MeatType>(["pork"]);
const FUTURE_SCOPE_LABEL = "Future validation / research use";

export function getMeatTypeScope(meatType: MeatType | string): MeatTypeScope {
  return VALIDATED_MEAT_TYPES.has(meatType as MeatType) ? "validated" : "future";
}

export function getMeatTypeScopeLabel(meatType: MeatType | string): string | null {
  return getMeatTypeScope(meatType) === "future" ? FUTURE_SCOPE_LABEL : null;
}

export function isValidatedMeatType(meatType: MeatType | string): boolean {
  return getMeatTypeScope(meatType) === "validated";
}
