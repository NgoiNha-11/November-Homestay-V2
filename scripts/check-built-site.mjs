import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const root = path.resolve('dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const jsPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
assert.ok(jsPath, 'Built script is missing');
const script = fs.readFileSync(path.resolve(root, jsPath), 'utf8');
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));
const files = new Set();
function walk(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) walk(path.join(dir, entry.name), name + '/');
    else files.add(name);
  }
}
walk(root);
let inspectedLinks = 0;
let openedPages = 0;
const external = new Set();
function audit(window, prefix) {
  const ids = [...window.document.querySelectorAll('[id]')].map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs');
  for (const el of window.document.querySelectorAll('a[href], img[src], script[src], link[href]')) {
    const raw = el.getAttribute(
      el.localName === 'img' || el.localName === 'script' ? 'src' : 'href',
    );
    assert.ok(raw && raw.trim(), 'Empty link');
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin) {
      assert.ok(
        ['https:', 'tel:', 'mailto:'].includes(url.protocol),
        'Unexpected external protocol: ' + url,
      );
      if (url.protocol === 'https:' && el.localName === 'a') external.add(url.href);
      if (el.getAttribute('target') === '_blank')
        assert.ok(el.rel.includes('noopener'), 'Missing noopener: ' + url);
      continue;
    }
    assert.ok(url.pathname.startsWith(prefix), 'Link escapes repository path: ' + url);
    let file = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!file || file.endsWith('/')) file += 'index.html';
    assert.ok(files.has(file), 'Missing or incorrectly cased built file: ' + file);
    if (
      url.searchParams.has('room') &&
      url.searchParams.get('room') !== new URL(window.location.href).searchParams.get('room')
    )
      assert.ok(
        catalog.rooms.some((r) => r.id === url.searchParams.get('room')),
        'Invalid room link',
      );
    if (url.searchParams.has('branch'))
      assert.ok(
        catalog.branches.some((b) => b.id === url.searchParams.get('branch')),
        'Invalid branch link',
      );
    if (
      file === 'index.html' &&
      url.hash &&
      !(
        url.hash === '#room-prices' &&
        url.searchParams.has('room') &&
        url.searchParams.get('room') !== new URL(window.location.href).searchParams.get('room')
      )
    )
      assert.ok(
        window.document.getElementById(decodeURIComponent(url.hash.slice(1))),
        'Missing anchor: ' + url.hash,
      );
    inspectedLinks++;
  }
}
async function open(url, prefix) {
  const window = new Window({
    url,
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  });
  const errors = [];
  window.console.error = (...args) => errors.push(args.map(String).join(' '));
  window.addEventListener('error', (event) => errors.push(String(event.error || event.message)));
  window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
  window.structuredClone = structuredClone;
  let clipboard = '';
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text) => {
        clipboard = text;
      },
    },
  });
  window.document.write(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replaceAll('rel="stylesheet"', 'rel="qa-disabled-stylesheet"'),
  );
  window.eval(script);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, [], 'Runtime errors at ' + url);
  // Prevent navigation/network calls while retaining app click handlers.
  window.document.addEventListener('click', (event) => {
    if (event.target.closest?.('a')) event.preventDefault();
  });
  audit(window, prefix);
  openedPages++;
  return { window, errors, copied: () => clipboard };
}
function node(window, selector) {
  const found = window.document.querySelector(selector);
  assert.ok(found, selector);
  return found;
}
function fill(window, selector, value) {
  const field = node(window, selector);
  field.value = value;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
  field.dispatchEvent(new window.Event('change', { bubbles: true }));
}
async function close(session) {
  assert.deepEqual(session.errors, []);
  await session.window.happyDOM.close();
}

for (const prefix of ['/', '/november-v2/']) {
  const base = 'https://novemberhomestay.com' + prefix;
  for (const lang of ['vi', 'en']) {
    const home = await open(base + '?lang=' + lang, prefix);
    const w = home.window;
    assert.equal(w.document.querySelectorAll('#room-grid .room-card').length, 20);
    assert.equal(w.document.querySelectorAll('#branch-grid .branch-card').length, 4);
    assert.equal(w.document.querySelectorAll('#review-grid .review-card').length, 10);
    node(w, '.menu-toggle').click();
    assert.equal(node(w, '.menu-toggle').getAttribute('aria-expanded'), 'true');
    node(w, '#navigation a').click();
    assert.equal(node(w, '.menu-toggle').getAttribute('aria-expanded'), 'false');
    node(w, '#hero-next').click();
    assert.equal(node(w, '[data-slide="1"]').getAttribute('aria-pressed'), 'true');
    node(w, '#hero-prev').click();
    assert.equal(node(w, '[data-slide="0"]').getAttribute('aria-pressed'), 'true');
    node(w, '[data-slide="3"]').click();
    assert.equal(node(w, '[data-slide="3"]').getAttribute('aria-pressed'), 'true');
    for (const summary of w.document.querySelectorAll('#faq summary, .branch-facilities summary')) {
      summary.click();
      assert.equal(summary.parentElement.open, true);
      summary.click();
      assert.equal(summary.parentElement.open, false);
    }
    const reviewList = node(w, '#review-grid');
    const moves = [];
    reviewList.scrollBy = (options) => moves.push(options.left);
    node(w, '.review-card').getBoundingClientRect = () => ({ width: 300 });
    Object.defineProperty(reviewList, 'clientWidth', { value: 600 });
    Object.defineProperty(reviewList, 'scrollWidth', { value: 3000 });
    reviewList.dispatchEvent(new w.Event('scroll'));
    const reviewButtons = w.document.querySelectorAll('.review-controls button');
    reviewButtons[1].click();
    reviewList.scrollLeft = 300;
    reviewList.dispatchEvent(new w.Event('scroll'));
    reviewButtons[0].click();
    assert.ok(moves[0] > 0 && moves[1] < 0);
    reviewList.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.ok(moves[2] > 0);
    fill(w, '#search', 'no-room-can-match-this');
    assert.equal(node(w, '#empty').hidden, false);
    node(w, '#empty-reset').click();
    assert.equal(w.document.querySelectorAll('#room-grid .room-card').length, 20);
    node(w, '[data-favorite="dbp101"]').click();
    assert.equal(node(w, '#favorite-count').textContent, '1');
    node(w, '#favorite-filter').click();
    assert.equal(w.document.querySelectorAll('#room-grid .room-card').length, 1);
    node(w, '[data-favorite="dbp101"]').click();
    assert.equal(node(w, '#empty').hidden, false);
    node(w, '#clear').click();
    fill(w, '#branch', 'hs');
    assert.equal(
      w.document.querySelectorAll('#room-grid .room-card').length,
      catalog.rooms.filter((r) => r.branch === 'hs').length,
    );
    node(w, '#clear').click();
    fill(w, '#budget', '350000');
    assert.ok(w.document.querySelectorAll('#room-grid .room-card').length > 0);
    fill(w, '#sort', 'asc');
    const prices = [...w.document.querySelectorAll('#room-grid .price')].map((el) =>
      Number(el.textContent.replace(/\D/g, '')),
    );
    assert.deepEqual(
      prices,
      [...prices].sort((a, b) => a - b),
    );
    node(w, '[data-amenity="Máy chiếu"]').click();
    assert.equal(node(w, '[data-amenity="Máy chiếu"]').getAttribute('aria-pressed'), 'true');
    node(w, '#clear').click();
    node(w, '.branch-overview-toggle').click();
    assert.equal(node(w, '.branch-overview-toggle').getAttribute('aria-expanded'), 'true');
    node(w, '#branch-grid [data-branch="pn"]').click();
    assert.equal(node(w, '#branch').value, 'pn');
    assert.equal(
      new URL(w.location.href).searchParams.get('lang'),
      lang,
      'Branch navigation lost language',
    );
    audit(w, prefix);
    await close(home);
    for (const branch of catalog.branches) {
      const landing = await open(base + '?branch=' + branch.id + '&lang=' + lang, prefix);
      assert.equal(node(landing.window, '#branch').value, branch.id);
      assert.equal(
        landing.window.document.querySelectorAll('#room-grid .room-card').length,
        catalog.rooms.filter((room) => room.branch === branch.id).length,
      );
      await close(landing);
    }

    for (const room of catalog.rooms) {
      const session = await open(base + '?room=' + room.id + '&lang=' + lang, prefix);
      const w = session.window;
      assert.equal(node(w, '#room-detail').hidden, false);
      assert.equal(node(w, '#home').hidden, true);
      node(w, '#next-photo').click();
      assert.equal(node(w, '.gallery-counter').textContent, '2 / ' + room.images.length);
      node(w, '#previous-photo').click();
      assert.equal(node(w, '.gallery-counter').textContent, '1 / ' + room.images.length);
      node(w, '[data-photo="2"]').click();
      assert.equal(node(w, '.gallery-counter').textContent, '3 / ' + room.images.length);
      fill(w, '#request-date', '2099-12-30');
      fill(w, '#request-checkout', '2099-12-31');
      node(w, '#copy-request').click();
      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(session.copied().includes('30/12/2099'));
      assert.ok(session.copied().includes(room.id.toUpperCase()));
      assert.ok(!session.copied().includes('500.000đ'));
      node(w, '#share-room').click();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(session.copied(), w.location.href);
      if (room.id === 'dbp101') {
        let shared;
        Object.defineProperty(w.navigator, 'share', {
          configurable: true,
          value: async (value) => {
            shared = value;
          },
        });
        node(w, '#share-room').click();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(shared.url, w.location.href);
        Object.defineProperty(w.navigator, 'share', {
          configurable: true,
          value: async () => {
            throw new w.DOMException('Cancelled', 'AbortError');
          },
        });
        node(w, '#share-room').click();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(session.copied(), w.location.href);
        Object.defineProperty(w.navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error('Clipboard unavailable');
            },
          },
        });
        node(w, '#copy-request').click();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(node(w, '.copy-fallback').hidden, false);
        assert.ok(node(w, '.copy-fallback').value.includes('30/12/2099'));
      }
      audit(w, prefix);
      await close(session);
    }
    for (const query of ['?page=rules', '?room=does-not-exist', '?s=broken-token']) {
      const session = await open(base + query + '&lang=' + lang, prefix);
      assert.ok(session.window.document.body.textContent.length > 100);
      await close(session);
    }
    const owner = await open(base + '?page=availability&lang=' + lang, prefix);
    const ow = owner.window;
    fill(ow, '#availability-password', 'ngoinha11');
    node(ow, '#availability-unlock').dispatchEvent(
      new ow.Event('submit', { bubbles: true, cancelable: true }),
    );
    fill(ow, '#offer-arrival', '2099-12-30');
    fill(ow, '#offer-departure', '2099-12-31');
    node(ow, '[data-offer-room="dbp101"]').click();
    fill(ow, '[data-offer-price="dbp101"]', '161');
    node(ow, '#preview-offer').click();
    assert.equal(node(ow, '#offer-preview').hidden, false);
    node(ow, '#generate-offer').click();
    await new Promise((resolve) => setImmediate(resolve));
    const link = owner.copied();
    assert.ok(new URL(link).searchParams.get('s'));
    node(ow, '#copy-offer-link').click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(owner.copied(), link);
    assert.equal(node(ow, '#open-offer-link').href, link);
    audit(ow, prefix);
    const guest = await open(link + '&lang=' + lang, prefix);
    assert.equal(guest.window.document.querySelectorAll('.offer-rooms .room-card').length, 1);
    assert.ok(
      node(guest.window, '.offer-rooms .price').textContent.includes(
        lang === 'en' ? '161,000' : '161.000',
      ),
    );
    const details = node(guest.window, '.offer-rooms .room-image').href;
    const calculation = node(guest.window, '.offer-calculation');
    assert.equal(calculation.open, false);
    node(guest.window, '.offer-calculation summary').click();
    assert.equal(calculation.open, true);
    const quoted = await open(details, prefix);
    assert.ok(
      node(quoted.window, '.room-offer').textContent.includes(
        lang === 'en' ? '161,000' : '161.000',
      ),
    );
    await close(quoted);
    await close(guest);
    await close(owner);
  }
}
for (const file of files) {
  if (!file.endsWith('.html') || file === 'index.html') continue;
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, href] of text.matchAll(/href="([^"]+)"/g)) {
    const url = new URL(href, 'https://novemberhomestay.com/' + file);
    assert.ok(files.has(url.pathname.slice(1)), 'Legacy redirect target missing: ' + file);
  }
}
console.log(
  `Verified ${openedPages} built pages, ${inspectedLinks} internal links/assets, and ${external.size} unique external destinations.`,
);
console.log(
  'External URLs have been checked for structure and configured destination; no messages were sent.',
);
