import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import {
  filterRooms,
  priceFor,
  startingPrice,
  roomCover,
  validateCatalog,
  type RoomFilters,
} from '../src/domain/catalog';
import { todayInSaigon } from '../src/shared/config';
const repository = new StaticCatalogRepository();
const filters: RoomFilters = {
  query: '',
  branchId: '',
  amenities: [],
  favoritesOnly: false,
  favorites: new Set(),
  sort: 'default',
};
test('catalog has 20 rooms with valid prices, unique stable IDs and four branches', async () => {
  const catalog = await repository.load();
  validateCatalog(catalog);
  assert.equal(catalog.rooms.length, 20);
  assert.deepEqual(
    catalog.branches.map((b) => b.id),
    ['dbp', 'pn', 'hs', 'hbt'],
  );
  assert.equal(filterRooms(catalog, { ...filters, branchId: 'pn' }).length, 2);
});
test('search ignores Vietnamese accents and case', async () => {
  const catalog = await repository.load();
  assert.equal(filterRooms(catalog, { ...filters, query: 'ĐIỆN BIÊN PHỦ' }).length, 6);
  assert.equal(filterRooms(catalog, { ...filters, query: 'dien bien phu' }).length, 6);
});
test('price budget applies to starting prices, independent of price array order', async () => {
  const catalog = await repository.load();
  catalog.rooms.forEach((r) => r.prices.reverse());
  assert.equal(filterRooms(catalog, { ...filters, maxPrice: 350000 }).length, 13);
  assert.equal(
    priceFor(
      catalog.rooms.find((r) => r.id === 'pn101')!,
      'morning',
    )!.value,
    330000,
  );
});
test('amenities, favorites and sorting combine without mutating source data', async () => {
  const catalog = await repository.load(),
    order = catalog.rooms.map((r) => r.id);
  const result = filterRooms(catalog, {
    ...filters,
    amenities: ['ban cong'],
    favoritesOnly: true,
    favorites: new Set(['pn201', 'pn101']),
  });
  assert.deepEqual(
    result.map((r) => r.id),
    ['pn201'],
  );
  const sorted = filterRooms(catalog, { ...filters, sort: 'desc' });
  assert.ok(startingPrice(sorted[0]).value >= startingPrice(sorted.at(-1)!).value);
  assert.deepEqual(
    catalog.rooms.map((r) => r.id),
    order,
  );
});
test('repository returns an independent copy and validation rejects broken relationships', async () => {
  const catalog = await repository.load();
  catalog.rooms[0].branch = 'missing';
  assert.throws(() => validateCatalog(catalog));
  validateCatalog(await repository.load());
});
test('guest request date uses Saigon date even when device is in another timezone', () => {
  assert.equal(todayInSaigon(new Date('2026-10-26T18:00:00Z')), '2026-10-27');
});

test('room covers always use numbered image 1 and HBT prices match supplied rates', async () => {
  const catalog = await repository.load();
  for (const room of catalog.rooms) assert.match(roomCover(room), /\(1\)\./);
  const expected: Record<string, number[]> = {
    dbp101: [330000, 400000, 500000],
    dbp401: [330000, 400000, 500000],
    hbtg01: [350000, 430000, 500000],
    hbt102: [370000, 470000, 560000],
    hbt101: [350000, 450000, 580000],
    hbt201: [350000, 450000, 580000],
    hbt301: [350000, 450000, 580000],
  };
  for (const [id, prices] of Object.entries(expected)) {
    const room = catalog.rooms.find((room) => room.id === id)!;
    assert.deepEqual(
      ['morning', 'overnight', 'daily'].map(
        (slot) => priceFor(room, slot as 'morning' | 'overnight' | 'daily')!.value,
      ),
      prices,
    );
  }
});
