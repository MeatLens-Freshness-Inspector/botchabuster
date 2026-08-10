import type { InspectionRecord } from "../../domain/ports/InspectionRepository";

/** @final */
export class InspectionView {
  private constructor() {}

  static detail(inspection: InspectionRecord): InspectionRecord {
    return { ...inspection };
  }
}
