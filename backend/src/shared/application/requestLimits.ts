import { ValidationError } from "../domain/errors/ApplicationError";

export interface BoundedIntegerOptions {
  name: string;
  minimum: number;
  maximum: number;
  defaultValue: number;
}

export function parseBoundedInteger(
  value: unknown,
  options: BoundedIntegerOptions,
): number {
  if (value === undefined || value === null) {
    return options.defaultValue;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^[+-]?\d+$/.test(value.trim())
      ? Number(value)
      : Number.NaN;

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${options.name} must be an integer`);
  }

  if (parsed < options.minimum || parsed > options.maximum) {
    throw new ValidationError(
      `${options.name} must be between ${options.minimum} and ${options.maximum}`,
    );
  }

  return parsed;
}
