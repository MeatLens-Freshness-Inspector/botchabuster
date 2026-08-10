import type { Config } from "../config";

export interface BackendDependencies {
  readonly config: Config;
}

export function createBackendDependencies(config: Config): BackendDependencies {
  return Object.freeze({ config });
}
