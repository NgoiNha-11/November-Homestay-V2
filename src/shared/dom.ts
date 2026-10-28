import { getLocale, t } from '../i18n';
export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}
export function targetElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}
export const esc = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
export const money = (value: number): string =>
  getLocale() === 'en'
    ? new Intl.NumberFormat('en-US').format(value) + ' VND'
    : new Intl.NumberFormat('vi-VN').format(value) + 'đ';
let toastTimer: ReturnType<typeof setTimeout>;
export function toast(message: string): void {
  $('.toast').textContent = t(message);
  $('.toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $('.toast').hidden = true;
  }, 3500);
}
export async function copy(text: string, fallback: HTMLTextAreaElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã sao chép. Bạn có thể dán để gửi ngay.');
  } catch {
    fallback.hidden = false;
    fallback.value = text;
    fallback.focus();
    fallback.select();
    toast('Bạn chọn sao chép phần nội dung đã được bôi đen nhé.');
  }
}
