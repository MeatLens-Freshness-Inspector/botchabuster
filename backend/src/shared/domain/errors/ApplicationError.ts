export abstract class ApplicationError extends Error {
  readonly isOperational = true;

  protected constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message = "Invalid request") {
    super(message, 400);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}
