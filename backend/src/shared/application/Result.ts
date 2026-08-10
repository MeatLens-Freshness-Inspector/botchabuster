type ResultState<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** @final */
export class Result<T, E> {
  private constructor(private readonly state: ResultState<T, E>) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>({ ok: true, value });
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>({ ok: false, error });
  }

  get ok(): boolean {
    return this.state.ok;
  }

  get value(): T {
    if (!this.state.ok) {
      throw new Error("Cannot read the value of a failed result");
    }

    return this.state.value;
  }

  get error(): E {
    if (this.state.ok) {
      throw new Error("Cannot read the error of a successful result");
    }

    return this.state.error;
  }
}
