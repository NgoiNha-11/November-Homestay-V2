import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import { mapLink } from '../src/shared/config';
import { roomView } from '../src/features/room/room-view';
import { branchView } from '../src/features/catalog/branch-view';

test('every branch and room map link searches the November Homestay branch name', async () => {
  const catalog = await new StaticCatalogRepository().load();
  for (const branch of catalog.branches) {
    const link = mapLink(branch);
    const url = new URL(link);
    assert.equal(url.hostname, 'www.google.com');
    assert.equal(url.searchParams.get('query'), `November Homestay ${branch.name}`);
    assert.ok(branchView(branch).includes(`href="${link}"`));
    for (const room of catalog.rooms.filter((room) => room.branch === branch.id)) {
      const html = roomView(room, branch);
      assert.ok(html.includes(`href="${link}"`));
      assert.ok(html.includes('id="room-prices"'));
    }
  }
});
