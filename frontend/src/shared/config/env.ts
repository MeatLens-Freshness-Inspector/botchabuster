type ViteEnvironment = Record<string, string | boolean | undefined>;

const viteEnvironment = (import.meta as ImportMeta & { env?: ViteEnvironment }).env ?? {};

export function readEnvironmentValue(name: string, environment: ViteEnvironment = viteEnvironment): string | undefined {
  const value = environment[name];

  return typeof value === "string" ? value : undefined;
}
