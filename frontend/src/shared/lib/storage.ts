export function readJson<T>(storage: Storage | null | undefined, storageKey: string): T | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson<T>(storage: Storage | null | undefined, storageKey: string, value: T): void {
  storage?.setItem(storageKey, JSON.stringify(value));
}
