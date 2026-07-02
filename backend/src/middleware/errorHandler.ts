import type { ErrorRequestHandler } from "express";
import multer from "multer";

type HttpError = Error & {
  body?: unknown;
  status?: number;
  statusCode?: number;
  type?: string;
};

function isInvalidJsonBodyError(error: unknown): error is SyntaxError & { body: unknown; status: number } {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: unknown }).status === 400 &&
    "body" in error
  );
}

function resolveErrorResponse(error: unknown): { status: number; message: string } {
  if (isInvalidJsonBodyError(error)) {
    return {
      status: 400,
      message: "Invalid JSON request body",
    };
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return {
        status: 413,
        message: "Uploaded file exceeds the maximum allowed size",
      };
    }

    return {
      status: 400,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    const httpError = error as HttpError;
    const status = httpError.statusCode ?? httpError.status;

    if (typeof status === "number" && status >= 400 && status < 500) {
      return {
        status,
        message: error.message || "Request failed",
      };
    }
  }

  return {
    status: 500,
    message: "Internal server error",
  };
}

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, message } = resolveErrorResponse(error);

  if (status >= 500) {
    console.error("Unhandled request error:", error);
  }

  res.status(status).json({ error: message });
};
