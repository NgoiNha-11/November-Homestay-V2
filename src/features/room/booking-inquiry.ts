import { nextDate, validDate, type Availability } from '../availability/availability';
import { getLocale, t } from '../../i18n';
import type { Room, Branch } from '../../domain/catalog';
import { $, toast, copy } from '../../shared/dom';
import { todayInSaigon } from '../../shared/config';

export function mountInquiry(r: Room, b: Branch, offer?: Availability): void {
  const today = todayInSaigon();
  $<HTMLInputElement>('#request-date').min = today;
  const checkout = $<HTMLInputElement>('#request-checkout');
  checkout.min = today;
  $<HTMLSelectElement>('#request-slot').value = 'Theo ngày (14h-12h)';
  if (offer) {
    $<HTMLInputElement>('#request-date').value = offer.arrival;
    checkout.value = offer.departure;
  }
  const arrival = $<HTMLInputElement>('#request-date');
  const slot = $<HTMLSelectElement>('#request-slot');
  const overnight = () => slot.value !== 'Theo giờ';
  const earliestCheckout = () => {
    const date = arrival.value || today;
    return overnight() ? nextDate(date) : date;
  };
  function dateError(): string {
    if (!validDate(arrival.value) || arrival.value < today)
      return t('Bạn vui lòng chọn ngày hôm nay hoặc sau đó.');
    if (!validDate(checkout.value) || checkout.value < earliestCheckout())
      return t(
        overnight()
          ? 'Ở qua đêm hoặc theo ngày: ngày đi phải sau ngày đến ít nhất một ngày.'
          : 'Ngày đi phải từ ngày đến trở đi.',
      );
    return '';
  }
  function message() {
    const date = $<HTMLInputElement>('#request-date').value;
    const departure = checkout.value;
    if (getLocale() === 'en')
      return `Hi Nov, I would like to enquire about ${t(r.name)} (${r.id.toUpperCase()}) at ${b.name}.\nArrival date: ${date ? date.split('-').reverse().join('/') : 'not selected'}.\nDeparture date: ${departure ? departure.split('-').reverse().join('/') : 'not selected'}.\nTime slot: ${t($<HTMLSelectElement>('#request-slot').value)}.\nCould you please confirm availability and the total price?`;
    return `Chào Nov, mình muốn hỏi ${r.name} (${r.id.toUpperCase()}) tại chi nhánh ${b.name}.\nNgày dự kiến đến: ${date ? date.split('-').reverse().join('/') : 'chưa chọn'}.\nNgày dự kiến đi: ${departure ? departure.split('-').reverse().join('/') : 'chưa chọn'}.\nKhung giờ: ${$<HTMLSelectElement>('#request-slot').value}.\nNov kiểm tra giúp mình tình trạng phòng và tổng giá nhé!`;
  }
  function preview(adjustCheckout = false) {
    checkout.min = earliestCheckout();
    if (
      adjustCheckout &&
      validDate(arrival.value) &&
      (!checkout.value || checkout.value < checkout.min)
    )
      checkout.value = checkout.min;
    const error = arrival.value ? dateError() : '';
    checkout.setCustomValidity(error);
    $('#request-status').textContent = error;
    $('#request-preview').textContent = message();
  }
  checkout.addEventListener('change', () => preview());
  preview(true);
  arrival.addEventListener('change', () => preview(true));
  slot.addEventListener('change', () => preview(true));
  $('#copy-request').addEventListener('click', async () => {
    if (!$<HTMLInputElement>('#request-date').value) {
      $<HTMLInputElement>('#request-date').focus();
      $<HTMLInputElement>('#request-date').reportValidity();
      toast('Bạn chọn ngày dự kiến trước nhé.');
      return;
    }
    if ($<HTMLInputElement>('#request-date').value < today) {
      toast('Bạn vui lòng chọn ngày hôm nay hoặc sau đó.');
      return;
    }
    preview();
    const error = dateError();
    if (error) {
      checkout.setCustomValidity(error);
      checkout.reportValidity();
      checkout.focus();
      return;
    }
    await copy(message(), $<HTMLTextAreaElement>('.copy-fallback'));
  });
  $('#share-room').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: location.href });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }
    await copy(location.href, $<HTMLTextAreaElement>('.copy-fallback'));
  });
}
