import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import {
  parseAvailability,
  encodeAvailability,
  decodeAvailability,
  validateAvailability,
  availabilityURL,
  nextDate,
  type Availability,
} from '../src/features/availability/availability';
import { availableView } from '../src/features/availability/availability-page';
const sample = `dạ 30/10 21h-9h hôm sau home còn trống:
CN Hoàng Sa:
- HS 102/202/302: 450k
CN Điện Biên Phủ:
- ĐBP 101: 400k
- ĐBP 201: 500k
- ĐBP 302: 450k
CN Hai Bà Trưng:
- HBT G01: 430k
- HBT 101: 470k
- HBT 102: 470k ạ`;
const repository = new StaticCatalogRepository();

test('the supplied message yields all nine rooms, exact quotes and the next morning', async () => {
  const catalog = await repository.load();
  const parsed = parseAvailability(sample, catalog, '2026-10-28');
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.arrival, '2026-10-30');
  assert.equal(parsed.departure, '2026-10-31');
  assert.equal(parsed.start, '21:00');
  assert.equal(parsed.end, '09:00');
  assert.equal(parsed.rooms.length, 9);
  assert.deepEqual(
    parsed.rooms.slice(0, 3),
    ['hs102', 'hs202', 'hs302'].map((id) => ({ id, price: 450000 })),
  );
  assert.equal(parsed.rooms.find((r) => r.id === 'dbp201')!.price, 500000);
  assert.equal(parsed.rooms.find((r) => r.id === 'hbt101')!.price, 470000);
  assert.equal(
    catalog.rooms.find((r) => r.id === 'hbt101')!.prices.find((p) => p.slot === 'overnight')!.value,
    450000,
  );
});
test('links round-trip under a subdirectory and details retain the whole offer', async () => {
  const catalog = await repository.load();
  const parsed = parseAvailability(sample, catalog, '2026-10-28');
  const offer = validateAvailability({ ...parsed, v: 1 }, catalog);
  const token = encodeAvailability(offer, catalog);
  assert.deepEqual(decodeAvailability(token, catalog), offer);
  const link = new URL(
    availabilityURL('https://example.com/november/index.html?page=availability&lang=vi', token),
  );
  assert.equal(link.pathname, '/november/');
  assert.equal(link.searchParams.get('s'), token);
  assert.equal(link.searchParams.has('page'), false);
  const roomURL = new URL(availabilityURL(link.href, token, 'hs202'));
  assert.equal(roomURL.searchParams.get('room'), 'hs202');
  assert.equal(roomURL.searchParams.get('s'), token);
  const html = availableView(offer, catalog, token, link.href);
  assert.ok(html.includes('450.000đ'));
  assert.ok(html.includes('30/10/2026'));
  assert.ok(html.includes('room=hs202'));
  assert.ok(!html.includes('room=hs501'));
});
test('room matching accepts branch context, currency separators and Vietnamese prefixes', async () => {
  const catalog = await repository.load();
  const parsed = parseAvailability(
    '30/10/2026 10h-14h\nCN Điện Biên Phủ:\n- 101/401: 400.000VNĐ\nCN Hai Bà Trưng:\n- G01: 430000',
    catalog,
    '2026-10-28',
  );
  assert.equal(parsed.arrival, parsed.departure);
  assert.equal(parsed.rooms.length, 3);
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rooms[0].price, 400000);
});
test('unknown rooms, duplicates, malformed lines and ambiguous amounts are reported', async () => {
  const catalog = await repository.load();
  for (const text of [
    'HS999: 450k',
    'HS102: 450k\nHS102: 470k',
    'HS102: chưa rõ',
    'HS102: 450',
    '- HS 102/999: 450k',
  ]) {
    assert.ok(parseAvailability(text, catalog, '2026-10-28').issues.length, text);
  }
});
test('date inference handles year boundaries, invalid dates and overnight month changes', async () => {
  const catalog = await repository.load();
  assert.equal(
    parseAvailability('01/01 21h-9h hôm sau\nHS102: 450k', catalog, '2026-12-30').arrival,
    '2027-01-01',
  );
  assert.equal(
    parseAvailability('31/02/2027 21h-9h\nHS102: 450k', catalog, '2026-10-28').arrival,
    '',
  );
  assert.equal(nextDate('2028-02-28'), '2028-02-29');
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
});
test('bad and tampered link payloads fail safely', async () => {
  const catalog = await repository.load();
  for (const token of [
    '',
    '%not-json',
    'a'.repeat(12001),
    btoa('{}'),
    btoa(JSON.stringify([1, '2026-10-30', '2026-10-29', '21:00', '09:00', [['hs102', 450000]]])),
  ]) {
    assert.throws(() => decodeAvailability(token, catalog));
  }
  const offer: Availability = {
    v: 1,
    arrival: '2026-10-30',
    departure: '2026-10-31',
    start: '21:00',
    end: '09:00',
    rooms: [{ id: 'hs102', price: 450000 }],
  };
  for (const rooms of [
    [{ id: 'hs999', price: 450000 }],
    [{ id: 'hs102', price: -1 }],
    [...offer.rooms, ...offer.rooms],
    [],
  ])
    assert.throws(() => validateAvailability({ ...offer, rooms }, catalog));
  assert.throws(() => validateAvailability({ ...offer, end: '99:00' }, catalog));
  assert.throws(() => validateAvailability({ ...offer, departure: offer.arrival }, catalog));
});

test('compact links preserve exact prices and catalog independence; reject old formats', async () => {
  const catalog = await repository.load();
  const parsed = parseAvailability(sample, catalog, '2026-10-28');
  const offer = validateAvailability({ ...parsed, v: 1 }, catalog);
  const legacy = btoa(
    JSON.stringify([
      1,
      offer.arrival,
      offer.departure,
      offer.start,
      offer.end,
      offer.rooms.map((r) => [r.id, r.price]),
    ]),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  const token = encodeAvailability(offer, catalog);
  assert.throws(() => decodeAvailability(legacy, catalog));
  assert.deepEqual(
    decodeAvailability(token, { ...catalog, rooms: [...catalog.rooms].reverse() }),
    offer,
  );
  assert.ok(token.length < 61);
  console.log('Full new link: ' + availabilityURL('https://novemberhomestay.com/', token));
  console.log('Availability token length: ' + legacy.length + ' → ' + token.length);
  for (const price of [1, 430001, 100000000]) {
    const exact = { ...offer, rooms: [{ id: 'hbtg01', price }] };
    assert.deepEqual(decodeAvailability(encodeAvailability(exact, catalog), catalog), exact);
  }
  for (const bad of ['2.', '2.A', '2._____w', token.slice(0, -3), token + 'AA'])
    assert.throws(() => decodeAvailability(bad, catalog));
  const all = { ...offer, rooms: catalog.rooms.map((r, i) => ({ id: r.id, price: 300000 + i })) };
  assert.deepEqual(decodeAvailability(encodeAvailability(all, catalog), catalog), all);
});

test('compact encoding handles minute precision, long stays, date boundaries and repeated prices', async () => {
  const catalog = await repository.load();
  for (const [arrival, departure] of [
    ['0000-01-01', '0000-01-02'],
    ['2019-12-31', '2020-01-01'],
    ['2028-02-28', '2028-03-02'],
    ['9999-12-30', '9999-12-31'],
  ]) {
    for (let count = 1; count <= catalog.rooms.length; count++) {
      const offer: Availability = {
        v: 1,
        arrival,
        departure,
        start: '23:59',
        end: '00:01',
        rooms: catalog.rooms
          .slice(0, count)
          .map((r, i) => ({ id: r.id, price: [450000, 400001, 450000, 1, 100000000][i % 5] })),
      };
      const token = encodeAvailability(offer, catalog);
      assert.deepEqual(decodeAvailability(token, catalog), offer);
      assert.throws(() => decodeAvailability(token + 'A', catalog));
    }
  }
});
