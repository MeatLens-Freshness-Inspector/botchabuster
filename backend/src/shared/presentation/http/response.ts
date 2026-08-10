import { ApplicationError } from "../../domain/errors/ApplicationError";

export interface HttpErrorResponse {
  status: number;
  body: { error: string };
}

export function toHttpErrorResponse(error: unknown): HttpErrorResponse {
  if (error instanceof ApplicationError && error.isOperational && error.statusCode >= 400 && error.statusCode < 500) {
    return {
      status: error.statusCode,
      body: { error: error.message },
    };
  }

  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}
