import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { StaticCatalogRepository } from '../src/data/catalog-repository';
import { mountAvailabilityBuilder } from '../src/features/availability/availability-page';
import { decodeAvailability } from '../src/features/availability/availability';

test('owner form unlocks, previews explicit totals, creates a complete link and invalidates stale previews', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const dom = new Window({ url: 'https://novemberhomestay.com/index.html?page=availability' });
  let copied = '';
  const globals: Record<string, unknown> = {
    document: dom.document,
    location: dom.location,
    Element: dom.Element,
    NodeFilter: dom.NodeFilter,
    localStorage: dom.localStorage,
    navigator: {
      clipboard: {
        writeText: async (text: string) => {
          copied = text;
        },
      },
    },
  };
  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  dom.HTMLElement.prototype.scrollIntoView = () => {};
  type Input = InstanceType<typeof dom.HTMLInputElement>;
  const element = (selector: string) => {
    const found = dom.document.querySelector(selector);
    assert.ok(found, selector);
    return found as Input;
  };
  const fill = (selector: string, value: string) => {
    const node = element(selector);
    node.value = value;
    node.dispatchEvent(new dom.Event('input', { bubbles: true }));
    node.dispatchEvent(new dom.Event('change', { bubbles: true }));
  };
  const click = (selector: string) => element(selector).click();
  const flush = async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  };
  try {
    const catalog = await new StaticCatalogRepository().load();
    dom.document.body.innerHTML =
      '<div id="home"></div><section id="availability-page" hidden></section><div class="toast" hidden></div>';
    mountAvailabilityBuilder(catalog);
    fill('#availability-password', 'incorrect');
    element('#availability-unlock').dispatchEvent(
      new dom.Event('submit', { bubbles: true, cancelable: true }),
    );
    assert.ok(element('#availability-password-error').textContent.includes('chưa đúng'));
    assert.equal(dom.document.querySelector('#offer-type'), null);
    fill('#availability-password', 'ngoinha11');
    element('#availability-unlock').dispatchEvent(
      new dom.Event('submit', { bubbles: true, cancelable: true }),
    );
    assert.equal(element('#offer-type').value, 'daily');
    assert.equal(element('#offer-start').value, '14:00');
    assert.equal(element('#offer-end').value, '12:00');
    assert.equal(dom.document.querySelector('#availability-source'), null);
    fill('#offer-arrival', '2099-10-30');
    fill('#offer-departure', '2099-11-01');
    assert.equal(element('#offer-nights').value, '2');
    fill('#offer-nights', '1');
    fill('#offer-departure', '2099-11-02');
    assert.equal(element('#offer-nights').value, '1');
    fill('#offer-start', '12:30');
    fill('#offer-end', '15:00');
    fill('#offer-early', '1.5');
    fill('#offer-late', '3');
    click('#preview-offer');
    assert.ok(element('#offer-error').textContent.length > 0);
    click('[data-offer-room="dbp101"]');
    assert.equal(element('[data-offer-price="dbp101"]').disabled, false);
    assert.equal(element('[data-offer-price="dbp101"]').required, true);
    fill('[data-offer-price="dbp101"]', '161');
    assert.equal(element('[data-offer-price-display="dbp101"]').textContent, '161.000 VND');
    click('[data-offer-room="hs102"]');
    fill('[data-offer-price="hs102"]', '800');
    fill('[data-fee-reason]', 'Lễ, Tết');
    click('#preview-offer');
    assert.ok(element('#offer-error').textContent.includes('Phụ thu cần lý do'));
    fill('[data-fee-percent]', '20');
    click('#add-surcharge');
    const rows = dom.document.querySelectorAll('.offer-surcharge-row');
    const secondReason = rows[1].querySelector('[data-fee-reason]') as Input;
    const secondPercent = rows[1].querySelector('[data-fee-percent]') as Input;
    secondReason.value = 'Cuối tuần';
    secondPercent.value = '2.5';
    click('#preview-offer');
    assert.equal(element('#offer-error').textContent, '');
    assert.equal(
      element('#offer-preview').hidden,
      false,
      [...dom.document.querySelectorAll('input:invalid')]
        .map((n) => {
          const i = n as Input;
          return i.id + ':' + i.value + ':' + i.validationMessage;
        })
        .join(' | '),
    );
    assert.equal(element('#generate-offer').disabled, false);
    assert.ok(element('#offer-preview').textContent.includes('22.5%'));
    assert.ok(element('#offer-preview').textContent.includes('161.000đ'));
    assert.equal(dom.document.querySelector('#offer-preview details')?.hasAttribute('open'), false);
    click('#generate-offer');
    await flush();
    assert.equal(element('#offer-output').hidden, false);
    assert.equal(copied, element('#offer-link').value);
    const offer = decodeAvailability(new URL(copied).searchParams.get('s')!, catalog);
    assert.deepEqual(offer.rooms, [
      { id: 'dbp101', price: 161000 },
      { id: 'hs102', price: 800000 },
    ]);
    assert.deepEqual(offer.calculation, {
      type: 'daily',
      units: 1,
      earlyHours: 1.5,
      lateHours: 3,
      surcharges: [
        { reason: 'Lễ, Tết', percent: 20 },
        { reason: 'Cuối tuần', percent: 2.5 },
      ],
    });
    assert.equal(offer.start, '12:30');
    assert.equal(offer.end, '15:00');
    fill('[data-offer-price="dbp101"]', '162');
    assert.equal(element('#generate-offer').disabled, true);
    assert.equal(element('#offer-output').hidden, true);
    assert.equal(element('#offer-preview').hidden, true);
    assert.equal(element('#offer-link').value, '');
    element('#availability-form').dispatchEvent(
      new dom.Event('submit', { bubbles: true, cancelable: true }),
    );
    await flush();
    assert.ok(element('#offer-error').textContent.includes('xem trước'));
    click('[data-offer-room="hs102"]');
    assert.equal(element('[data-offer-price="hs102"]').disabled, true);
    click('#preview-offer');
    click('#generate-offer');
    await flush();
    assert.equal(
      decodeAvailability(new URL(copied).searchParams.get('s')!, catalog).rooms.length,
      1,
    );
    fill('#offer-type', 'overnight');
    assert.equal(element('#offer-start').value, '21:00');
    assert.equal(element('#offer-end').value, '09:00');
    fill('#offer-start', '22:00');
    assert.equal(element('#offer-start').value, '22:00');
    fill('#offer-type', 'hourly');
    assert.equal(element('#offer-hours').disabled, false);
    assert.equal(element('#offer-hours').value, '4');
    assert.equal(element('#offer-nights').disabled, true);
    fill('#offer-type', 'other');
    fill('#offer-early', '0');
    fill('#offer-late', '0');
    assert.equal(element('#offer-hours').disabled, true);
    click('#preview-offer');
    assert.equal(dom.document.querySelector('#offer-preview details'), null);
    for (let n = dom.document.querySelectorAll('.offer-surcharge-row').length; n < 5; n++)
      click('#add-surcharge');
    assert.equal(element('#add-surcharge').disabled, true);
    click('[data-remove-fee]');
    assert.equal(element('#add-surcharge').disabled, false);
    // The same owner/guest workflow also renders in English.
    dom.location.search = '?page=availability&lang=en';
    mountAvailabilityBuilder(catalog);
    fill('#availability-password', 'ngoinha11');
    element('#availability-unlock').dispatchEvent(
      new dom.Event('submit', { bubbles: true, cancelable: true }),
    );
    fill('#offer-arrival', '2099-12-30');
    fill('#offer-departure', '2099-12-31');
    click('[data-offer-room="dbp101"]');
    fill('[data-offer-price="dbp101"]', '500');
    click('#preview-offer');
    assert.equal(element('#offer-error').textContent, '');
    assert.ok(element('#offer-preview').textContent.includes('Available rooms for your stay'));
    assert.ok(element('#offer-preview').textContent.includes('Daily rate × 1 night(s)'));
    assert.ok(element('#offer-preview').textContent.includes('500,000 VND'));
    assert.equal(dom.document.querySelector('#offer-preview details')?.hasAttribute('open'), false);
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    await dom.happyDOM.close();
  }
});
