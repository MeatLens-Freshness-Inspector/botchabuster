type RecordedOperation = {
  table: string;
  action: string;
  args: unknown[];
};

export class FakeSupabaseGateway {
  readonly operations: RecordedOperation[] = [];

  record(table: string, action: string, ...args: unknown[]): void {
    this.operations.push({ table, action, args });
  }
}
