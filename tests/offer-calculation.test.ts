import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import {
  encodeAvailability,
  decodeAvailability,
  validateAvailability,
  type Availability,
  type StayType,
} from '../src/features/availability/availability';
import { availableView, offerNotice } from '../src/features/availability/availability-page';

const repository = new StaticCatalogRepository();
const base: Availability = {
  v: 1,
  arrival: '2099-10-30',
  departure: '2099-11-01',
  start: '12:00',
  end: '14:00',
  rooms: [
    { id: 'dbp101', price: 1234567 },
    { id: 'hs102', price: 987654 },
  ],
  calculation: {
    type: 'daily',
    units: 2,
    earlyHours: 2,
    lateHours: 2,
    surcharges: [
      { reason: 'Lễ, Tết', percent: 20 },
      { reason: 'Cuối tuần', percent: 2.55 },
    ],
  },
};

test('shared fees and fractional extras round-trip without recalculating final room totals', async () => {
  const catalog = await repository.load();
  for (const type of ['hourly', 'overnight', 'daily', 'other'] as StayType[]) {
    const offer: Availability = {
      ...base,
      calculation: {
        ...base.calculation!,
        type,
        units: type === 'hourly' ? 4.25 : type === 'daily' ? 2 : 1,
        earlyHours: 0.25,
        lateHours: 1.5,
      },
    };
    const token = encodeAvailability(offer, catalog);
    const decoded = decodeAvailability(token, { ...catalog, rooms: [...catalog.rooms].reverse() });
    assert.deepEqual(decoded, offer);
    assert.deepEqual(decoded.rooms, base.rooms);
    assert.throws(() => decodeAvailability(token.slice(0, -2), catalog));
    assert.throws(() => decodeAvailability(token + 'A', catalog));
  }
  const maximum: Availability = {
    ...base,
    calculation: {
      ...base.calculation!,
      surcharges: Array.from({ length: 5 }, () => ({ reason: '🏡'.repeat(80), percent: 100 })),
    },
  };
  assert.deepEqual(decodeAvailability(encodeAvailability(maximum, catalog), catalog), maximum);
});

test('guest page has actual dates, collapsed calculation, shared additive fees and no brand eyebrow', async () => {
  const catalog = await repository.load();
  const token = encodeAvailability(base, catalog);
  const html = availableView(base, catalog, token, 'https://novemberhomestay.com/');
  assert.ok(html.includes('Phòng trống cho kỳ nghỉ của bạn'));
  assert.ok(!html.includes('NOVEMBER HOMESTAY'));
  assert.ok(html.includes('<strong>Check-in (12:00): 30/10/2099</strong>'));
  assert.ok(html.includes('<strong>Check-out (14:00): 01/11/2099</strong>'));
  assert.ok(html.includes('<details class="offer-calculation">'));
  assert.ok(!html.includes('<details class="offer-calculation" open'));
  assert.ok(html.includes('Giá theo ngày × 2 đêm'));
  assert.ok(html.includes('Extra nhận sớm: 2 giờ × 50.000đ'));
  assert.ok(html.includes('Extra trả muộn: 2 giờ × 50.000đ'));
  assert.ok(html.includes('22.55%'));
  assert.ok(html.includes('1.234.567đ'));
  assert.ok(html.includes('987.654đ'));
  const other: Availability = {
    ...base,
    calculation: { type: 'other', units: 1, earlyHours: 0, lateHours: 0, surcharges: [] },
  };
  assert.ok(!offerNotice(other).includes('offer-calculation'));
  other.calculation!.lateHours = 1;
  assert.ok(offerNotice(other).includes('Extra trả muộn'));
  assert.ok(!offerNotice(other).includes('Giá theo'));
  const unsafe: Availability = {
    ...base,
    calculation: {
      ...base.calculation!,
      surcharges: [{ reason: '<img src=x onerror=alert(1)>', percent: 10 }],
    },
  };
  assert.ok(!offerNotice(unsafe).includes('<img src=x'));
  assert.ok(offerNotice(unsafe).includes('&lt;img'));
});

test('rejects incomplete fees, invalid units, impossible dates and invalid extras', async () => {
  const catalog = await repository.load();
  for (const change of [
    { units: 0 },
    { units: 1.5 },
    { type: 'unknown' },
    { earlyHours: -1 },
    { lateHours: 0.1 },
    { earlyHours: 100, lateHours: 100 },
    { surcharges: [{ reason: '', percent: 20 }] },
    { surcharges: [{ reason: 'Lễ', percent: 0 }] },
    { surcharges: [{ reason: 'Lễ', percent: 101 }] },
    { surcharges: [{ reason: 'Lễ', percent: 2.555 }] },
    { surcharges: [{ reason: 'x'.repeat(81), percent: 20 }] },
    { surcharges: Array.from({ length: 6 }, () => ({ reason: 'Lễ', percent: 1 })) },
  ])
    assert.throws(() =>
      validateAvailability({ ...base, calculation: { ...base.calculation!, ...change } }, catalog),
    );
  assert.throws(() =>
    validateAvailability({ ...base, departure: base.arrival, end: '15:00' }, catalog),
  );
});
