import { translateText, type Locale } from './translations';
export function resolveLocale(query: string, stored: string | null): Locale {
  const requested = new URLSearchParams(query).get('lang');
  return requested === 'en' || requested === 'vi' ? requested : stored === 'en' ? 'en' : 'vi';
}
export function getLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('november-language');
  } catch {
    /* Storage is optional. */
  }
  return resolveLocale(typeof location === 'undefined' ? '' : location.search, stored);
}
export const t = (value: string): string => translateText(value, getLocale());
/** Translate owned UI text only; guest reviews and proper names keep their original content. */
export function localize(root: HTMLElement): void {
  if (getLocale() !== 'en') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (
      current.parentElement?.closest('[data-no-translate], script, style, .brand, .language-switch')
    )
      continue;
    const original = current.textContent ?? '';
    const translated = t(original);
    if (translated !== original.trim().replace(/\s+/g, ' '))
      current.textContent = original.replace(/\S[\s\S]*\S|\S/, translated);
  }
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const url = new URL(link.href, location.href);
    if (
      url.origin === location.origin &&
      !link.target &&
      (url.pathname.endsWith('.html') || url.pathname.endsWith('/'))
    ) {
      url.searchParams.set('lang', 'en');
      link.href = url.href;
    }
  }
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    if (element.closest('[data-no-translate]')) continue;
    for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
      const value = element.getAttribute(attr);
      if (value) element.setAttribute(attr, t(value));
    }
  }
}
export function mountLanguageSwitch(): void {
  document.documentElement.lang = getLocale();
  const selector = document.querySelector<HTMLSelectElement>('#language');
  if (!selector) return;
  selector.value = getLocale();
  selector.addEventListener('change', () => {
    const locale = selector.value === 'en' ? 'en' : 'vi';
    try {
      localStorage.setItem('november-language', locale);
    } catch {
      /* URL still persists choice. */
    }
    const url = new URL(location.href);
    url.searchParams.set('lang', locale);
    location.assign(url.href);
  });
}
