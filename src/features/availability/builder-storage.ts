const UNLOCK_KEY = 'november-builder-unlock-v1';
const DRAFT_KEY = 'november-builder-draft-v1';
const HOUR = 60 * 60 * 1000;

export interface BuilderDraft {
  savedAt: number;
  fields: Record<string, string>;
  rooms: Record<string, { checked: boolean; price: string; expression?: string; result?: string }>;
  fees: { reason: string; percent: string }[];
  nightsEdited: boolean;
}

// Storage can be unavailable in private browsing or when the device is full.
export function storeBuilder(key: 'unlock' | 'draft', value: unknown): boolean {
  try {
    const name = key === 'unlock' ? UNLOCK_KEY : DRAFT_KEY;
    if (value === null) localStorage.removeItem(name);
    else localStorage.setItem(name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function builderUnlocked(): boolean {
  try {
    const expiry: unknown = JSON.parse(localStorage.getItem(UNLOCK_KEY) ?? 'null');
    return typeof expiry === 'number' && expiry > Date.now() && expiry <= Date.now() + 12 * HOUR;
  } catch {
    return false;
  }
}

export function unlockBuilder(): void {
  storeBuilder('unlock', Date.now() + 12 * HOUR);
}

export function loadBuilderDraft(): BuilderDraft | undefined {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as BuilderDraft | null;
    if (!draft) return;
    if (
      !Number.isFinite(draft.savedAt) ||
      Date.now() - draft.savedAt >= 24 * HOUR ||
      draft.savedAt > Date.now()
    ) {
      storeBuilder('draft', null);
      return;
    }
    if (
      !draft.fields ||
      !draft.rooms ||
      !Array.isArray(draft.fees) ||
      draft.fees.length > 5 ||
      typeof draft.nightsEdited !== 'boolean' ||
      !Object.values(draft.fields).every((value) => typeof value === 'string') ||
      !Object.values(draft.rooms).every(
        (room) => room && typeof room.checked === 'boolean' && typeof room.price === 'string',
      ) ||
      !draft.fees.every(
        (fee) => fee && typeof fee.reason === 'string' && typeof fee.percent === 'string',
      )
    )
      return;
    return draft;
  } catch {
    return;
  }
}
