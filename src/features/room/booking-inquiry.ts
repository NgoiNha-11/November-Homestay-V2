import { validDate, type Availability } from '../availability/availability';
import { getLocale, t } from '../../i18n';
import type { Room, Branch } from '../../domain/catalog';
import { $, esc, toast, copy } from '../../shared/dom';
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
  const allowedSlots = () => {
    if (!validDate(arrival.value) || !validDate(checkout.value) || checkout.value < arrival.value)
      return [];
    const nights =
      (Date.parse(checkout.value + 'T00:00:00Z') - Date.parse(arrival.value + 'T00:00:00Z')) /
      86_400_000;
    return nights === 0
      ? ['Theo giờ']
      : nights === 1
        ? ['Qua đêm (21h-9h)', 'Theo ngày (14h-12h)']
        : ['Theo ngày (14h-12h)'];
  };
  function dateError(): string {
    const currentDay = todayInSaigon();
    if (!validDate(arrival.value) || arrival.value < currentDay || checkout.value < currentDay)
      return t('Bạn vui lòng chọn ngày hôm nay hoặc sau đó.');
    if (!validDate(checkout.value) || checkout.value < arrival.value)
      return t('Ngày đi phải từ ngày đến trở đi.');
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
    const currentDay = todayInSaigon();
    arrival.min = currentDay;
    checkout.min =
      validDate(arrival.value) && arrival.value > currentDay ? arrival.value : currentDay;
    if (
      adjustCheckout &&
      validDate(arrival.value) &&
      (!checkout.value || checkout.value < checkout.min)
    )
      checkout.value = checkout.min;
    const allowed = allowedSlots();
    const previous = slot.value;
    if ([...slot.options].map((option) => option.value).join('|') !== allowed.join('|')) {
      slot.innerHTML = allowed
        .map((value) => `<option value="${esc(value)}">${esc(t(value))}</option>`)
        .join('');
      slot.value = allowed.includes(previous)
        ? previous
        : allowed.includes('Theo ngày (14h-12h)')
          ? 'Theo ngày (14h-12h)'
          : (allowed[0] ?? '');
    }
    slot.disabled = allowed.length === 0;
    if (allowed.length && !allowed.includes(slot.value))
      slot.value = allowed.includes('Theo ngày (14h-12h)') ? 'Theo ngày (14h-12h)' : allowed[0];
    const error = arrival.value ? dateError() : '';
    checkout.setCustomValidity(error);
    $('#request-status').textContent = error;
    $('#request-preview').textContent = message();
  }
  checkout.addEventListener('change', () => preview());
  checkout.addEventListener('input', () => preview());
  arrival.addEventListener('input', () => preview());
  preview(true);
  arrival.addEventListener('change', () => preview(true));
  slot.addEventListener('change', () => preview());
  $('#copy-request').addEventListener('click', async () => {
    if (!$<HTMLInputElement>('#request-date').value) {
      $<HTMLInputElement>('#request-date').focus();
      $<HTMLInputElement>('#request-date').reportValidity();
      toast('Bạn chọn ngày dự kiến trước nhé.');
      return;
    }
    if ($<HTMLInputElement>('#request-date').value < todayInSaigon()) {
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
