import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice } from '../src/features/availability/price-calculator';
import {
  builderUnlocked,
  unlockBuilder,
  storeBuilder,
  loadBuilderDraft,
  type BuilderDraft,
} from '../src/features/availability/builder-storage';

test('calculator handles precedence, decimals, rounding and rejects unsafe or incomplete expressions', () => {
  assert.equal(calculatePrice('350 × 2 + 100'), 800);
  assert.equal(calculatePrice('100 - 20 / 2'), 90);
  assert.equal(calculatePrice('1,5 * 50'), 75);
  assert.equal(calculatePrice('100 / 3'), 33.333);
  assert.equal(calculatePrice('0.1 + 0.2'), 0.3);
  assert.equal(calculatePrice('100x2+100'), 300);
  assert.equal(calculatePrice('=(100+50)*2'), 300);
  assert.equal(calculatePrice('2*(30+(40/2))'), 100);
  assert.equal(calculatePrice('100+50*2'), 200);
  for (const expression of [
    '1/0',
    '20+',
    '1;alert(1)',
    '-10',
    '100001',
    '2**3',
    '',
    '(100+50',
    '100)',
    '2(30)',
  ])
    assert.throws(() => calculatePrice(expression), expression);
});

test('unlock expires after 12 hours; drafts expire 24 hours after editing and tolerate broken storage', (context) => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  let now = 1000000000;
  context.mock.method(Date, 'now', () => now);
  try {
    unlockBuilder();
    const draft: BuilderDraft = {
      savedAt: now,
      fields: { early: '1.5' },
      rooms: {},
      fees: [],
      nightsEdited: true,
    };
    storeBuilder('draft', draft);
    now += 12 * 60 * 60 * 1000 - 1;
    assert.equal(builderUnlocked(), true);
    now++;
    assert.equal(builderUnlocked(), false);
    assert.deepEqual(loadBuilderDraft(), draft);
    now += 12 * 60 * 60 * 1000;
    assert.equal(loadBuilderDraft(), undefined);
    storage.setItem('november-builder-draft-v1', '{broken');
    assert.equal(loadBuilderDraft(), undefined);
    storage.setItem = () => {
      throw new Error('Storage blocked');
    };
    assert.equal(storeBuilder('draft', draft), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
