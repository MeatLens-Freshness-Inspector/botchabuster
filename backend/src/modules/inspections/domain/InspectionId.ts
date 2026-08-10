const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @final */
export class InspectionId {
  private constructor(public readonly value: string) {}

  static create(value: string): InspectionId {
    const normalized = value.trim();
    if (!UUID_PATTERN.test(normalized)) {
      throw new Error("Inspection ID must be a valid UUID");
    }

    return new InspectionId(normalized);
  }
}
