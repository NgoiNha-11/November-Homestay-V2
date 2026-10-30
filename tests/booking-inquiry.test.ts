import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Window,
  type HTMLInputElement,
  type HTMLSelectElement,
  type HTMLButtonElement,
  type HTMLTextAreaElement,
} from 'happy-dom';
import { mountInquiry } from '../src/features/room/booking-inquiry';
import { roomView } from '../src/features/room/room-view';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import { todayInSaigon } from '../src/shared/config';

test('inquiry restricts slots by stay length and blocks past or reversed dates', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-30T03:00:00Z') });
  const window = new Window();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: window.document });
  try {
    const catalog = await new StaticCatalogRepository().load();
    const room = catalog.rooms[0];
    const branch = catalog.branches.find((b) => b.id === room.branch)!;
    window.document.body.innerHTML = roomView(room, branch) + '<div class="toast" hidden></div>';
    mountInquiry(room, branch);
    const arrival = window.document.querySelector<HTMLInputElement>('#request-date')!;
    const departure = window.document.querySelector<HTMLInputElement>('#request-checkout')!;
    const slot = window.document.querySelector<HTMLSelectElement>('#request-slot')!;
    const change = (element: any) => element.dispatchEvent(new window.Event('change'));
    const choices = () =>
      [...slot.options].filter((option) => !option.disabled).map((option) => option.value);
    assert.equal(arrival.min, todayInSaigon());
    assert.ok(departure.min >= todayInSaigon());
    arrival.value = '2026-10-30';
    change(arrival);
    assert.equal(departure.min, '2026-10-30');
    departure.value = '2026-11-01';
    change(departure);
    assert.deepEqual(choices(), ['Theo ngày (14h-12h)']);
    departure.value = '2026-10-30';
    change(departure);
    assert.equal(departure.value, '2026-10-30');
    assert.equal(departure.checkValidity(), true);
    assert.deepEqual(choices(), ['Theo giờ']);
    arrival.value = '2099-10-30';
    change(arrival);
    departure.value = '2099-10-30';
    departure.dispatchEvent(new window.Event('input'));
    assert.deepEqual(choices(), ['Theo giờ']);
    assert.equal(slot.options.length, 1);
    assert.equal(slot.value, 'Theo giờ');
    departure.value = '2099-10-31';
    change(departure);
    assert.deepEqual(choices(), ['Qua đêm (21h-9h)', 'Theo ngày (14h-12h)']);
    assert.equal(slot.options.length, 2);
    slot.value = 'Qua đêm (21h-9h)';
    change(slot);
    assert.equal(slot.value, 'Qua đêm (21h-9h)');
    departure.value = '2099-11-02';
    change(departure);
    assert.deepEqual(choices(), ['Theo ngày (14h-12h)']);
    assert.equal(slot.value, 'Theo ngày (14h-12h)');
    assert.equal(slot.options.length, 1);
    departure.value = '2099-10-30';
    departure.dispatchEvent(new window.Event('input'));
    assert.equal(slot.value, 'Theo giờ');
    departure.value = '2099-11-02';
    departure.dispatchEvent(new window.Event('input'));
    assert.ok(
      window.document.querySelector('#request-preview')!.textContent!.includes('02/11/2099'),
    );
    departure.value = '2099-10-29';
    change(departure);
    assert.ok(window.document.querySelector('#request-status')!.textContent);
    assert.equal(slot.disabled, true);
    arrival.value = '2000-01-01';
    departure.value = '2000-01-02';
    change(arrival);
    assert.ok(window.document.querySelector('#request-status')!.textContent!.includes('hôm nay'));
    assert.equal(arrival.min, todayInSaigon());
    assert.equal(departure.min, todayInSaigon());
    window.document.querySelector<HTMLButtonElement>('#copy-request')!.click();
    assert.equal(
      window.document.querySelector<HTMLTextAreaElement>('.copy-fallback')!.value.trim(),
      '',
    );
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 3600));
    if (original) Object.defineProperty(globalThis, 'document', original);
    else Reflect.deleteProperty(globalThis, 'document');
    await window.happyDOM.close();
  }
});
