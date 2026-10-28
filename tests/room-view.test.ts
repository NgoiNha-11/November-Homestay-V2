import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import { roomView } from '../src/features/room/room-view';

test('all room pages render matching branch, every photo and all quoted prices', async () => {
  const catalog = await new StaticCatalogRepository().load();
  for (const room of catalog.rooms) {
    const branch = catalog.branches.find((branch) => branch.id === room.branch)!;
    const html = roomView(room, branch);
    assert.ok(html.includes(`<h1>${room.name} · ${branch.name}</h1>`));
    assert.ok(html.includes(branch.address));
    for (const image of room.images) assert.ok(html.includes(encodeURI(image)));
    for (const price of room.prices)
      assert.ok(html.includes(price.value.toLocaleString('vi-VN') + 'đ'));
    assert.ok(!html.includes('undefined'));
    assert.ok(html.includes('request-date'));
    assert.ok(html.includes('index.html?branch=' + room.branch));
  }
});
test('room and amenity text is escaped before rendering', async () => {
  const catalog = await new StaticCatalogRepository().load();
  const room = catalog.rooms[0];
  room.description = '<script>alert("x")</script>';
  room.amenities = ['<img src=x onerror=alert(1)>'];
  const html = roomView(room, catalog.branches[0]);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;'));
});
