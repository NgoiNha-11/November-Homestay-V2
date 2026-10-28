import { airbnbReviews } from '../../data/reviews';
import { $, esc } from '../../shared/dom';

export function mountReviews(): void {
  const list = $('#review-grid');
  list.setAttribute('tabindex', '0');
  list.setAttribute('role', 'region');
  list.setAttribute('aria-label', 'Đánh giá khách hàng — cuộn ngang để xem thêm');
  list.innerHTML = airbnbReviews.items
    .map(
      (review) => `
    <figure class="review-card">
      <div class="review-stars" aria-label="${review.rating} trên 5 sao">★★★★★</div>
      <p class="review-content" data-no-translate lang="${review.language}">${esc(review.excerpt)}</p>
      <a class="review-original" href="${esc(airbnbReviews.sourceUrl)}" target="_blank" rel="noopener">Xem trên Airbnb ↗</a><figcaption><span class="review-avatar" aria-hidden="true">${esc(review.name[0])}</span><div><strong data-no-translate>${esc(review.name)}</strong><span>Đánh giá trên Airbnb</span></div></figcaption>
    </figure>`,
    )
    .join('');
  const controls = document.createElement('div');
  controls.className = 'review-controls';
  controls.innerHTML =
    '<span>Kéo ngang để xem thêm</span><button type="button" aria-label="Xem đánh giá trước">←</button><button type="button" aria-label="Xem đánh giá tiếp theo">→</button>';
  list.before(controls);
  const [previous, next] = controls.querySelectorAll<HTMLButtonElement>('button');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function move(direction: number): void {
    const card = list.querySelector<HTMLElement>('.review-card');
    if (!card) return;
    const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
    list.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  }
  function updateControls(): void {
    previous.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  list.addEventListener('keydown', (event) => {
    if (event.target !== list || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  list.addEventListener('scroll', updateControls, { passive: true });
  const resizeObserver = new ResizeObserver(updateControls);
  resizeObserver.observe(list);
  let drag: { id: number; x: number; scroll: number } | undefined;
  list.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, scroll: list.scrollLeft };
  });
  list.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const offset = event.clientX - drag.x;
    if (Math.abs(offset) > 5 && !list.classList.contains('dragging')) {
      list.classList.add('dragging');
      list.setPointerCapture(event.pointerId);
    }
    if (list.classList.contains('dragging')) list.scrollLeft = drag.scroll - offset;
  });
  function endDrag(): void {
    drag = undefined;
    list.classList.remove('dragging');
    updateControls();
  }
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('lostpointercapture', endDrag);
  list.addEventListener('pointerleave', () => {
    if (!list.classList.contains('dragging')) drag = undefined;
  });
  window.addEventListener('pagehide', () => resizeObserver.disconnect(), { once: true });
  requestAnimationFrame(updateControls);
  const source = $<HTMLAnchorElement>('#reviews-source');
  source.href = airbnbReviews.sourceUrl;
}
