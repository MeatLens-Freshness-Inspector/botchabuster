/** @final */
export class PageLimit {
  private constructor(public readonly value: number) {}

  static create(value: number, maximum: number): PageLimit {
    if (!Number.isInteger(maximum) || maximum < 1) {
      throw new Error("Page limit maximum must be a positive integer");
    }

    if (!Number.isInteger(value)) {
      throw new Error("Page limit must be an integer");
    }

    if (value < 1 || value > maximum) {
      throw new Error(`Page limit must be between 1 and ${maximum}`);
    }

    return new PageLimit(value);
  }
}

/** @final */
export class PageOffset {
  private constructor(public readonly value: number) {}

  static create(value: number): PageOffset {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Page offset must be a non-negative integer");
    }

    return new PageOffset(value);
  }
}

/** @final */
export class Cursor {
  private constructor(public readonly value: string) {}

  static create(value: string): Cursor {
    const normalized = value.trim();
    if (!normalized) {
      throw new Error("Cursor is required");
    }

    if (normalized.length > 512) {
      throw new Error("Cursor is too long");
    }

    return new Cursor(normalized);
  }
}
