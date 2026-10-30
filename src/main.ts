import { localize, mountLanguageSwitch, t } from './i18n';
import './styles/main.css';
import {
  mountAvailabilityBuilder,
  mountAvailable,
} from './features/availability/availability-page';
import { StaticCatalogRepository } from './data/catalog-repository';
import { mountCatalog } from './features/catalog/catalog-page';
import { mountRoom } from './features/room/room-page';
import { mountReviews } from './features/reviews/reviews-section';
import { mountHeroCarousel } from './features/home/hero-carousel';
import { mountRules } from './features/rules/rules-page';
import { $, targetElement } from './shared/dom';
async function main(): Promise<void> {
  mountLanguageSwitch();
  const animateSocial = (event: Event): void => {
    const link = targetElement(event)?.closest<HTMLAnchorElement>('.footer-social a');
    if (!link || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    link.classList.remove('is-bubbling');
    void link.offsetWidth;
    link.classList.add('is-bubbling');
    link.addEventListener('animationend', () => link.classList.remove('is-bubbling'), {
      once: true,
    });
  };
  document.addEventListener('pointerdown', animateSocial);
  document.addEventListener('click', (event) => {
    if (event.detail === 0) animateSocial(event);
  });
  const catalog = await new StaticCatalogRepository().load();
  const params = new URLSearchParams(location.search);
  $('.menu-toggle').addEventListener('click', () => {
    const open = $('#navigation').classList.toggle('open');
    $('.menu-toggle').setAttribute('aria-expanded', String(open));
  });
  $('#navigation').addEventListener('click', () => {
    $('#navigation').classList.remove('open');
    $('.menu-toggle').setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', (event) => {
    const link = targetElement(event)?.closest<HTMLAnchorElement>('a[href]');
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target ||
      link.hasAttribute('download')
    )
      return;
    const url = new URL(link.href, location.href);
    if (
      !url.hash ||
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.search !== location.search
    )
      return;
    const destination = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!destination) return;
    event.preventDefault();
    history.pushState(null, '', url.hash);
    destination.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  });
  $('#year').textContent = String(new Date().getFullYear());
  if (params.has('room')) mountRoom(catalog, params.get('room')!, params.get('s') ?? undefined);
  else if (params.get('page') === 'availability') mountAvailabilityBuilder(catalog);
  else if (params.has('s')) mountAvailable(catalog, params.get('s') ?? '');
  else if (params.get('page') === 'rules') mountRules();
  else {
    mountCatalog(catalog, params.get('branch') ?? '');
    mountHeroCarousel();
    mountReviews();
  }
  localize(document.body);
  if (params.has('room') && location.hash === '#room-prices') {
    requestAnimationFrame(() => {
      const prices = document.getElementById('room-prices');
      if (prices) {
        prices.setAttribute('tabindex', '-1');
        prices.scrollIntoView({ behavior: 'instant', block: 'start' });
        prices.focus({ preventScroll: true });
      }
    });
  }
  document.title = t(document.title);
  const description = document.querySelector<HTMLMetaElement>('meta[name=description]');
  if (description) description.content = t(description.content);
}
main().catch((error) => {
  console.error('Unable to start November', error);
  $('#home').hidden = true;
  const detail = $('#room-detail');
  detail.hidden = false;
  detail.innerHTML =
    '<h1>Nov chưa tải được thông tin phòng</h1><p>Bạn thử tải lại trang hoặc liên hệ Nov nhé.</p><a class="button" href="https://zalo.me/0703277997">Liên hệ Nov qua Zalo ↗</a><a class="button cream" href="https://wa.me/84703277997" target="_blank" rel="noopener">Nhắn Nov qua WhatsApp ↗</a>';
  localize(document.body);
});
