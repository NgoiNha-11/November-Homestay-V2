import type { Branch } from '../domain/catalog';
export const contact = {
  phone: '+84703277997',
  whatsapp: 'https://wa.me/84703277997',
  zalo: 'https://zalo.me/0703277997',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;
export const mapLink = (branch: Branch): string =>
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('November Homestay ' + branch.name);
export function todayInSaigon(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: contact.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
