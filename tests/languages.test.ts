import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale } from '../src/i18n';
import { translateText } from '../src/i18n/translations';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import { filterRooms } from '../src/domain/catalog';
import { houseRules } from '../src/data/house-rules';
import { airbnbReviews } from '../src/data/reviews';

test('language URL overrides stored preference, with safe Vietnamese fallback', () => {
  assert.equal(resolveLocale('?room=hs201&lang=en', 'vi'), 'en');
  assert.equal(resolveLocale('?lang=vi', 'en'), 'vi');
  assert.equal(resolveLocale('', 'en'), 'en');
  assert.equal(resolveLocale('?lang=invalid', null), 'vi');
});
test('Vietnamese remains unchanged and proper names are preserved', () => {
  assert.equal(translateText('Phòng 101', 'vi'), 'Phòng 101');
  assert.equal(translateText('Hai Bà Trưng', 'en'), 'Hai Bà Trưng');
});
test('English covers dynamic room labels, results and hourly/daily prices', () => {
  assert.equal(translateText('18 căn phòng dành cho bạn', 'en'), '18 rooms for you');
  assert.equal(translateText('Phòng 101 · Điện Biên Phủ', 'en'), 'Room 101 · Điện Biên Phủ');
  assert.equal(translateText('14h-12h (ngày hôm sau)', 'en'), '2 pm–12 noon (next day)');
});
test('all room amenities, descriptions and house rules have English copy', async () => {
  const catalog = await new StaticCatalogRepository().load();
  const texts = [
    ...catalog.rooms.flatMap((r) => [
      r.name,
      r.description,
      ...r.amenities,
      ...r.notes,
      ...r.overview,
    ]),
    ...houseRules.flatMap((r) => [r.title, r.text]),
  ];
  for (const text of texts) {
    if (/[À-ỹđĐ]/.test(text)) assert.notEqual(translateText(text, 'en'), text, text);
  }
});
test('English queries find rooms using translated amenities', async () => {
  const catalog = await new StaticCatalogRepository().load();
  const result = filterRooms(catalog, {
    query: 'projector',
    branchId: '',
    amenities: [],
    favoritesOnly: false,
    favorites: new Set(),
    sort: 'default',
  });
  assert.ok(result.length > 0);
  assert.ok(result.every((r) => r.amenities.some((a) => a.includes('Máy chiếu'))));
});
test('review strip contains ten five-star summaries with declared languages', () => {
  assert.equal(airbnbReviews.items.length, 10);
  assert.ok(airbnbReviews.items.every((r) => r.rating === 5));
  assert.ok(airbnbReviews.items.some((r) => r.language === 'vi'));
  assert.ok(airbnbReviews.items.some((r) => r.language === 'en'));
});
