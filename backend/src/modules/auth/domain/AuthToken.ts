/** @final */
export class AuthToken {
  private constructor(public readonly value: string) {}

  static create(value: string): AuthToken {
    const normalized = value.trim();
    if (!normalized) {
      throw new Error("Auth token is required");
    }

    return new AuthToken(normalized);
  }

  toString(): string {
    return this.value;
  }
}
