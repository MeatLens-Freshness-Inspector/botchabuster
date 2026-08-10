export type PasskeyCeremonyType = "registration" | "authentication";

export interface PasskeyCeremonyRecord {
  challenge: string;
  type: PasskeyCeremonyType;
  origin: string;
  rpId: string;
  userId?: string;
}

interface StoredCeremonyRecord extends PasskeyCeremonyRecord {
  expiresAt: number;
}

export class PasskeyCeremonyStore {
  private readonly store = new Map<string, StoredCeremonyRecord>();

  constructor(
    private readonly ttlMs = 5 * 60 * 1000,
    private readonly nowMs: () => number = () => Date.now(),
  ) {}

  save(challengeId: string, record: PasskeyCeremonyRecord): void {
    this.store.set(challengeId, {
      ...record,
      expiresAt: this.nowMs() + this.ttlMs,
    });
  }

  consume(challengeId: string): PasskeyCeremonyRecord | null {
    const record = this.store.get(challengeId);
    if (!record) {
      return null;
    }

    this.store.delete(challengeId);

    if (record.expiresAt <= this.nowMs()) {
      return null;
    }

    const { expiresAt: _expiresAt, ...ceremony } = record;
    return ceremony;
  }

  hydrateFrom(other: PasskeyCeremonyStore): void {
    for (const [challengeId, record] of other.store.entries()) {
      this.store.set(challengeId, { ...record });
    }
  }
}

export const passkeyCeremonyStore = new PasskeyCeremonyStore();
