import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { decorateIcons, heartIcon } from '../src/shared/icons';
import { translateText } from '../src/i18n/translations';

test('arrows and hearts render as decorative SVGs without changing links or duplicating icons', async () => {
  const window = new Window();
  try {
    window.document.body.innerHTML =
      '<a href="?room=dbp101" aria-label="Chi tiết">Xem phòng ↗️</a><button>♡ Đã lưu</button><p data-no-translate>Guest ♡ ↗</p>';
    const root = window.document.body as unknown as HTMLElement;
    decorateIcons(root);
    decorateIcons(root);
    assert.equal(window.document.querySelectorAll('a svg').length, 1);
    assert.equal(window.document.querySelector('a')!.textContent.trim(), 'Xem phòng');
    assert.equal(window.document.querySelector('a')!.getAttribute('href'), '?room=dbp101');
    assert.equal(window.document.querySelector('a')!.getAttribute('aria-label'), 'Chi tiết');
    assert.equal(window.document.querySelector('button svg')!.getAttribute('fill'), 'none');
    for (const icon of window.document.querySelectorAll('svg')) {
      assert.equal(icon.namespaceURI, 'http://www.w3.org/2000/svg');
      assert.equal(icon.getAttribute('aria-hidden'), 'true');
      assert.equal(icon.getAttribute('focusable'), 'false');
    }
    assert.equal(window.document.querySelector('[data-no-translate]')!.textContent, 'Guest ♡ ↗');
    window.document.querySelector('button')!.innerHTML = heartIcon(true);
    assert.equal(window.document.querySelector('button svg')!.getAttribute('fill'), 'currentColor');
    assert.equal(translateText('Chia sẻ', 'en'), 'Share');
    assert.equal(translateText('Đã lưu', 'en'), 'Saved');
    assert.equal(translateText('Chia sẻ ↗', 'en'), 'Share ↗');
  } finally {
    await window.happyDOM.close();
  }
});
