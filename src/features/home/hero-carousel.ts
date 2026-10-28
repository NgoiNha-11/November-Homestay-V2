import { $, targetElement } from '../../shared/dom';

export function mountHeroCarousel(): void {
  const hero = $('.hero');
  const track = $('.hero-track');
  const slides = [...document.querySelectorAll<HTMLElement>('.hero-slide')];
  const dots = [...document.querySelectorAll<HTMLButtonElement>('[data-slide]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0,
    direction = 1,
    hovering = false,
    focused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function schedule(): void {
    clearTimeout(timer);
    if (hovering || focused || document.hidden || reducedMotion.matches) return;
    timer = setTimeout(() => {
      if (current === slides.length - 1) direction = -1;
      if (current === 0) direction = 1;
      show(current + direction);
    }, 6000);
  }
  function show(index: number): void {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== current)));
    dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === current)));
    schedule();
  }
  $('#hero-prev').addEventListener('click', () => show(current - 1));
  $('#hero-next').addEventListener('click', () => show(current + 1));
  $('.hero-dots').addEventListener('click', (event) => {
    const dot = targetElement(event)?.closest<HTMLButtonElement>('[data-slide]');
    if (dot) show(Number(dot.dataset.slide));
  });
  hero.addEventListener('mouseenter', () => {
    hovering = true;
    schedule();
  });
  hero.addEventListener('mouseleave', () => {
    hovering = false;
    schedule();
  });
  hero.addEventListener('focusin', () => {
    focused = true;
    schedule();
  });
  hero.addEventListener('focusout', (event) => {
    focused = event.relatedTarget instanceof Node && hero.contains(event.relatedTarget);
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
  window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
  schedule();
}
