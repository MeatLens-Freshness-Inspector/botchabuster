import type { BackendDependencies } from "./dependencies";

export interface ModuleRegistry {
  readonly dependencies: BackendDependencies;
}

export function createModuleRegistry(dependencies: BackendDependencies): ModuleRegistry {
  return Object.freeze({ dependencies });
}
