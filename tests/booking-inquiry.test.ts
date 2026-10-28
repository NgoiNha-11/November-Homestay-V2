import test from 'node:test';
import assert from 'node:assert/strict';
import { mountInquiry } from '../src/features/room/booking-inquiry';
import { StaticCatalogRepository } from '../src/data/catalog-repository';

test('multi-day enquiries include arrival and departure and reject reversed dates', async () => {
  const nodes = new Map<string, any>();
  function node(selector: string): any {
    if (!nodes.has(selector))
      nodes.set(selector, {
        value: '',
        textContent: '',
        events: {} as Record<string, Function>,
        addEventListener(type: string, fn: Function) {
          this.events[type] = fn;
        },
        focus() {},
        reportValidity() {},
        setCustomValidity() {},
        select() {},
      });
    return nodes.get(selector);
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { querySelector: node },
  });
  try {
    const catalog = await new StaticCatalogRepository().load();
    const room = catalog.rooms[0];
    mountInquiry(
      room,
      catalog.branches.find((b) => b.id === room.branch)!,
      {
        v: 1,
        arrival: '2099-10-30',
        departure: '2099-10-31',
        start: '21:00',
        end: '09:00',
        rooms: [{ id: room.id, price: 123000 }],
      },
    );
    assert.equal(node('#request-date').value, '2099-10-30');
    assert.equal(node('#request-checkout').value, '2099-10-31');
    assert.equal(node('#request-slot').value, 'Theo ngày (14h-12h)');
    assert.ok(node('#request-preview').textContent.includes('Khung giờ: Theo ngày (14h-12h)'));
    assert.ok(!node('#request-preview').textContent.includes('123.000đ'));
    assert.equal(node('#request-checkout').min, '2099-10-31');
    node('#request-slot').value = 'Qua đêm (21h-9h)';
    node('#request-slot').events.change();
    assert.ok(node('#request-preview').textContent.includes('Khung giờ: Qua đêm (21h-9h)'));
    assert.ok(!node('#request-preview').textContent.includes('123.000đ'));
    assert.equal(node('#request-status').textContent, '');
    node('#request-checkout').value = '2099-10-30';
    node('#request-checkout').events.change();
    node('.copy-fallback').value = 'unchanged';
    await node('#copy-request').events.click();
    assert.equal(node('.copy-fallback').value, 'unchanged');
    assert.ok(node('#request-status').textContent.includes('ngày đi phải sau ngày đến'));
    node('#request-checkout').value = '2099-10-31';
    node('#request-checkout').events.change();
    node('#request-slot').value = 'Theo giờ';
    node('#request-slot').events.change();
    assert.ok(node('#request-preview').textContent.includes('Khung giờ: Theo giờ'));
    node('#request-date').value = '2099-11-01';
    node('#request-checkout').value = '2099-11-04';
    node('#request-date').events.change();
    assert.ok(node('#request-preview').textContent.includes('01/11/2099'));
    assert.ok(node('#request-preview').textContent.includes('04/11/2099'));
    assert.equal(node('#request-checkout').min, '2099-11-01');
    await node('#copy-request').events.click();
    assert.ok(node('.copy-fallback').value.includes('04/11/2099'));
    assert.ok(!node('.copy-fallback').value.includes('123.000đ'));
    assert.ok(!node('.copy-fallback').value.includes('30/10/2099'));
    assert.ok(!node('.copy-fallback').value.includes('Vui lòng xác nhận tổng tiền mới'));
    const offerMessage = node('.copy-fallback').value;
    // The same selection produces the identical message without an offer.
    mountInquiry(
      room,
      catalog.branches.find((b) => b.id === room.branch)!,
    );
    node('#request-slot').value = 'Theo giờ';
    node('#request-slot').events.change();
    await node('#copy-request').events.click();
    assert.equal(node('.copy-fallback').value, offerMessage);
    node('.copy-fallback').value = 'unchanged';
    node('#request-checkout').value = '2099-10-31';
    await node('#copy-request').events.click();
    assert.equal(node('.copy-fallback').value, 'unchanged');
    node('#request-checkout').value = '';
    await node('#copy-request').events.click();
    assert.equal(node('.copy-fallback').value, 'unchanged');
    // A normal visit keeps the daily default and corrects checkout across year boundaries.
    nodes.clear();
    mountInquiry(
      room,
      catalog.branches.find((b) => b.id === room.branch)!,
    );
    assert.equal(node('#request-slot').value, 'Theo ngày (14h-12h)');
    node('#request-date').value = '2099-12-31';
    node('#request-date').events.change();
    assert.equal(node('#request-checkout').value, '2100-01-01');
    node('#request-slot').value = 'Theo giờ';
    node('#request-slot').events.change();
    node('#request-checkout').value = '2099-12-31';
    node('#request-checkout').events.change();
    assert.equal(node('#request-status').textContent, '');
    await node('#copy-request').events.click();
    assert.ok(node('.copy-fallback').value.includes('Khung giờ: Theo giờ'));
    node('#request-slot').value = 'Qua đêm (21h-9h)';
    node('#request-slot').events.change();
    assert.equal(node('#request-checkout').value, '2100-01-01');
    node('#request-slot').value = 'Theo ngày (14h-12h)';
    node('#request-slot').events.change();
    node('#request-checkout').value = '2099-12-31';
    node('.copy-fallback').value = 'unchanged';
    await node('#copy-request').events.click();
    assert.equal(node('.copy-fallback').value, 'unchanged');
    await new Promise((resolve) => setTimeout(resolve, 3600));
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
