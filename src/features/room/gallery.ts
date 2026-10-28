import { t } from '../../i18n';
import type { Room } from '../../domain/catalog';
import { $, targetElement } from '../../shared/dom';

export function mountGallery(r: Room): void {
  let current = 0;
  function photo(i: number): void {
    current = (i + r.images.length) % r.images.length;
    $<HTMLImageElement>('#gallery-image').src = encodeURI(r.images[current]);
    $<HTMLImageElement>('#gallery-image').alt = t(`${r.name} — Ảnh ${current + 1}`);
    $('.gallery-counter').textContent = `${current + 1} / ${r.images.length}`;
    document
      .querySelectorAll<HTMLButtonElement>('[data-photo]')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.photo) === current)));
  }
  let touchStart = 0;
  $('.gallery-main').addEventListener(
    'touchstart',
    (e) => {
      touchStart = e.changedTouches[0].screenX;
    },
    { passive: true },
  );
  $('.gallery-main').addEventListener(
    'touchend',
    (e) => {
      const delta = e.changedTouches[0].screenX - touchStart;
      if (Math.abs(delta) > 50) photo(current + (delta < 0 ? 1 : -1));
    },
    { passive: true },
  );
  $('#previous-photo').addEventListener('click', () => photo(current - 1));
  $('#next-photo').addEventListener('click', () => photo(current + 1));
  $('.thumbnails').addEventListener('click', (e) => {
    const b = targetElement(e)?.closest<HTMLButtonElement>('[data-photo]');
    if (b) photo(Number(b.dataset.photo));
  });
}
