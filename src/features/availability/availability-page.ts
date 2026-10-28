import type { Catalog } from '../../domain/catalog';
import { roomCover } from '../../domain/catalog';
import { $, esc, money, copy, targetElement } from '../../shared/dom';
import { localize, t } from '../../i18n';
import { todayInSaigon } from '../../shared/config';
import {
  availabilityURL,
  decodeAvailability,
  displayDate,
  encodeAvailability,
  nextDate,
  stayNights,
  validateAvailability,
  type Availability,
  type StayType,
} from './availability';

export function offerSummary(offer: Availability): string {
  return `${displayDate(offer.arrival)} → ${displayDate(offer.departure)} · ${offer.start}–${offer.end}`;
}
export function offerNotice(offer: Availability): string {
  const c = offer.calculation;
  const lines: string[] = [];
  if (c?.type === 'daily') lines.push(`${t('Giá theo ngày')} × ${c.units} ${t('đêm')}`);
  if (c?.type === 'overnight') lines.push(t('Giá 1 đêm'));
  if (c?.type === 'hourly') lines.push(`${t('Giá theo giờ')} · ${c.units} ${t('tiếng')}`);
  if (c?.earlyHours)
    lines.push(`${t('Extra nhận sớm')}: ${c.earlyHours} ${t('giờ')} × ${money(50000)}`);
  if (c?.lateHours)
    lines.push(`${t('Extra trả muộn')}: ${c.lateHours} ${t('giờ')} × ${money(50000)}`);
  const fees = c?.surcharges ?? [];
  return `<div class="offer-notice"><p><strong>${t('Thời gian')}</strong></p>
<p><strong>Check-in (${esc(offer.start)}): ${esc(displayDate(offer.arrival))}</strong><br><strong>Check-out (${esc(offer.end)}): ${esc(displayDate(offer.departure))}</strong></p>
${lines.length ? `<details class="offer-calculation"><summary>${t('Xem cách tính')}</summary><ul>${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul></details>` : ''}
${fees.length ? `<div class="offer-fees"><p><strong>${t('Phụ thu áp dụng cho tất cả phòng')}</strong></p><ul>${fees.map((fee) => `<li><span data-no-translate>${esc(fee.reason)}</span>: ${fee.percent}%</li>`).join('')}</ul>${fees.length > 1 ? `<p>${t('Tổng tỷ lệ phụ thu')}: ${Number(fees.reduce((sum, fee) => sum + fee.percent, 0).toFixed(2))}% (${t('cộng các tỷ lệ, không tính chồng')})</p>` : ''}</div>` : ''}
<p>${t('Tổng tiền từng phòng bên dưới đã bao gồm extra và phụ thu nếu có.')}</p>
<p>${t('Tình trạng phòng có thể thay đổi, vui lòng liên hệ Nov để kiểm tra.')}</p>
${offer.departure < todayInSaigon() ? `<p><strong>${t('Danh sách này đã qua ngày lưu trú. Vui lòng hỏi Nov lịch mới.')}</strong></p>` : ''}</div>`;
}
export function availableView(
  offer: Availability,
  catalog: Catalog,
  token: string,
  base: string,
): string {
  return `<a class="underlink" href="index.html">${t('Trang chủ')}</a><h1>${t('Phòng trống cho kỳ nghỉ của bạn')}</h1>${offerNotice(offer)}
<div class="room-grid offer-rooms">${offer.rooms
    .map((row) => {
      const room = catalog.rooms.find((r) => r.id === row.id)!;
      const branch = catalog.branches.find((b) => b.id === room.branch)!;
      const url = availabilityURL(base, token, row.id);
      return `<article class="room-card"><a class="room-image" href="${esc(url)}"><img src="${esc(roomCover(room))}" alt="${esc(room.name + ' · ' + branch.name)}" width="600" height="800" loading="lazy"><span class="room-tag">${esc(branch.name)}</span></a><div class="card-top"><h3><a href="${esc(url)}">${esc(t(room.name))}</a></h3></div><p class="room-desc">${esc(t(room.description))}</p><div class="card-bottom"><span><small>${t('Tổng cộng')}</small><br><strong class="price">${money(row.price)}</strong></span><a class="underlink" href="${esc(url)}">${t('Xem chi tiết & hỏi phòng ↗')}</a></div></article>`;
    })
    .join('')}</div>`;
}
export function mountAvailable(catalog: Catalog, token: string): void {
  $('#home').hidden = true;
  const page = $('#availability-page');
  page.hidden = false;
  document.title = t('Danh sách phòng trống — November Homestay');
  try {
    page.innerHTML = availableView(
      decodeAvailability(token, catalog),
      catalog,
      token,
      location.href,
    );
  } catch {
    page.innerHTML = `<h1>${t('Không mở được danh sách')}</h1><p>${t('Link danh sách không hợp lệ hoặc đã bị thiếu nội dung. Bạn vui lòng xin Nov gửi lại link.')}</p><a class="underlink" href="index.html">${t('Trang chủ')}</a>`;
  }
}
export function mountAvailabilityBuilder(catalog: Catalog): void {
  $('#home').hidden = true;
  const page = $('#availability-page');
  page.hidden = false;
  document.title = 'Tạo danh sách phòng trống — November Homestay';
  page.innerHTML = `<a class="underlink" href="index.html">Trang chủ</a><h1>Tạo danh sách phòng trống</h1>
<form id="availability-unlock" class="availability-form">
<label for="availability-password">Mật khẩu<input id="availability-password" type="password" autocomplete="current-password" required></label>
<p id="availability-password-error" role="alert"></p><button class="button" type="submit">Tiếp tục</button></form>`;
  $('#availability-unlock').addEventListener('submit', (event) => {
    event.preventDefault();
    const password = $<HTMLInputElement>('#availability-password');
    if (password.value !== 'ngoinha11') {
      $('#availability-password-error').textContent = t('Mật khẩu chưa đúng. Vui lòng thử lại.');
      password.value = '';
      password.focus();
      return;
    }
    renderAvailabilityBuilder(catalog);
    localize(page);
    $('#offer-type').focus();
  });
}

/** Shared by the owner form and interaction tests. The password entry mounts this form. */
export function builderView(catalog: Catalog): string {
  return `<a class="underlink" href="index.html">Trang chủ</a><h1>Tạo danh sách phòng trống</h1><p>Chọn lịch lưu trú, các phòng còn trống và nhập tổng tiền cuối cùng cho từng phòng.</p>
<form id="availability-form" class="availability-form">
<h2>1. Thời gian lưu trú</h2>
<label>Loại lưu trú<select id="offer-type"><option value="hourly">Theo giờ</option><option value="overnight">Qua đêm</option><option value="daily" selected>Theo ngày</option><option value="other">Loại khác</option></select></label>
<div class="availability-dates"><label>Ngày dự kiến đến<input type="date" id="offer-arrival" required></label><label>Ngày dự kiến đi<input type="date" id="offer-departure" required></label><label>Giờ đến<input type="time" id="offer-start" required></label><label>Giờ đi<input type="time" id="offer-end" required></label></div>
<p class="availability-help">Nhập ngày và giờ nhận/trả thực tế. Extra không tự cộng hoặc trừ vào lịch này.</p>
<div class="availability-dates offer-extras"><label id="offer-nights-field">Số đêm tính giá<input type="number" id="offer-nights" min="1" max="3650" step="1" value="1" required></label><label id="offer-hours-field" hidden>Số giờ gói cơ bản<input type="number" id="offer-hours" min="0.25" max="168" step="0.25" value="4" disabled></label><label>Extra nhận sớm (giờ)<input type="number" id="offer-early" min="0" max="168" step="0.25" placeholder="0"></label><label>Extra trả muộn (giờ)<input type="number" id="offer-late" min="0" max="168" step="0.25" placeholder="0"></label></div>
<p class="availability-help">Extra: 50.000đ/giờ. Có thể nhập 0,5 giờ hoặc 0,25 giờ. Số đêm được gợi ý theo ngày; kiểm tra lại nếu extra làm lịch sang ngày khác.</p>
<h2>2. Phụ thu chung (không bắt buộc)</h2><p class="availability-help">Áp dụng cho tất cả phòng. Nhiều phụ thu được cộng tỷ lệ, không tính chồng. Tổng tiền nhập bên dưới đã bao gồm các khoản này.</p>
<div id="offer-surcharges">${surchargeRow(0)}</div><button type="button" class="underlink" id="add-surcharge">Thêm phụ thu</button>
<h2>3. Chọn phòng còn trống</h2><p class="availability-help">Tổng tiền khách thanh toán — đã gồm extra và phụ thu nếu có</p>
${catalog.branches
  .map(
    (branch) =>
      `<fieldset class="offer-branch"><legend>${esc(branch.name)}</legend>${catalog.rooms
        .filter((room) => room.branch === branch.id)
        .map(
          (room) =>
            `<div class="offer-room-choice"><label class="offer-room-toggle"><input type="checkbox" data-offer-room="${esc(room.id)}"><span>${esc(room.name)} · ${esc(room.id.toUpperCase())}</span></label><label class="offer-room-price" hidden>Tổng tiền khách thanh toán — đã gồm extra và phụ thu nếu có<input type="number" data-offer-price="${esc(room.id)}" aria-label="${esc(t('Tổng cộng') + ' ' + room.id.toUpperCase())}" min="0.001" max="100000" step="any" inputmode="decimal" aria-describedby="offer-price-help-${esc(room.id)}" disabled><small id="offer-price-help-${esc(room.id)}">${t('Đơn vị nghìn VND — nhập 161 = 161.000 VND')}</small><output class="offer-price-display" data-offer-price-display="${esc(room.id)}" aria-live="polite"></output></label></div>`,
        )
        .join('')}</fieldset>`,
  )
  .join('')}
<p id="offer-selection-count" role="status"></p><p id="offer-error" role="alert"></p>
<div class="availability-actions"><button type="button" class="button cream" id="preview-offer">Xem trước danh sách</button><button type="submit" class="button" id="generate-offer" disabled>Tạo link và sao chép</button></div>
<p class="availability-help">Xem trước và kiểm tra danh sách trước khi tạo link. Extra và phụ thu không được cộng thêm lần nữa.</p>
</form>
<section id="offer-preview" class="offer-preview" aria-label="Xem trước danh sách" hidden></section>
<div id="offer-output" class="offer-output" hidden><h2>Link gửi khách</h2><textarea id="offer-link" rows="3" aria-label="Link gửi khách" readonly></textarea><div class="availability-actions"><button type="button" class="button" id="copy-offer-link">Sao chép link</button><a class="button cream" id="open-offer-link" target="_blank" rel="noopener">Xem trang khách</a></div><p>Mỗi link giữ danh sách tại thời điểm tạo. Khi phòng đã được đặt hoặc giá thay đổi, hãy tạo và gửi link mới.</p></div>`;
}
function surchargeRow(index: number): string {
  return `<div class="offer-surcharge-row"><label>Lý do phụ thu<input type="text" data-fee-reason maxlength="80" placeholder="Ví dụ: Lễ, Tết"></label><label>Phụ thu (%)<input type="number" data-fee-percent min="0.01" max="100" step="any" inputmode="decimal" placeholder="20"></label><button type="button" class="text-button" data-remove-fee="${index}" aria-label="Bỏ phụ thu">Bỏ phụ thu</button></div>`;
}
export function renderAvailabilityBuilder(catalog: Catalog): void {
  const page = $('#availability-page');
  page.innerHTML = builderView(catalog);
  const form = $<HTMLFormElement>('#availability-form');
  const input = (id: string) => $<HTMLInputElement>('#offer-' + id);
  const type = $<HTMLSelectElement>('#offer-type');
  type.value = 'daily';
  const generate = $<HTMLButtonElement>('#generate-offer');
  let reviewed: Availability | undefined;
  let nightsEdited = false;
  let feeIndex = 1;
  function invalidate() {
    reviewed = undefined;
    generate.disabled = true;
    $('#offer-preview').hidden = true;
    $('#offer-output').hidden = true;
    $<HTMLTextAreaElement>('#offer-link').value = '';
    $('#offer-error').textContent = '';
  }
  function syncSchedule(resetTimes = false) {
    const kind = type.value as StayType;
    const overnight = kind === 'daily' || kind === 'overnight';
    if (resetTimes) {
      if (kind === 'daily') {
        input('start').value = '14:00';
        input('end').value = '12:00';
      }
      if (kind === 'overnight') {
        input('start').value = '21:00';
        input('end').value = '09:00';
      }
    }
    input('departure').min = overnight ? nextDate(input('arrival').value) : input('arrival').value;
    if (input('departure').value < input('departure').min)
      input('departure').value = input('departure').min;
    $('#offer-nights-field').hidden = kind !== 'daily';
    input('nights').disabled = kind !== 'daily';
    $('#offer-hours-field').hidden = kind !== 'hourly';
    input('hours').disabled = kind !== 'hourly';
    input('hours').required = kind === 'hourly';
    if (!nightsEdited)
      input('nights').value = String(stayNights(input('arrival').value, input('departure').value));
  }
  function readOffer(): Availability {
    if (!page.querySelector('[data-offer-room]:checked'))
      throw new Error(t('Bạn chọn ít nhất một phòng còn trống.'));
    const surcharges = [...page.querySelectorAll<HTMLElement>('.offer-surcharge-row')].flatMap(
      (row) => {
        const reason = row.querySelector<HTMLInputElement>('[data-fee-reason]')!.value.trim();
        const rawPercent = row.querySelector<HTMLInputElement>('[data-fee-percent]')!.value;
        return !reason && !rawPercent ? [] : [{ reason, percent: Number(rawPercent) }];
      },
    );
    const kind = type.value as StayType;
    const offer = validateAvailability(
      {
        v: 1,
        arrival: input('arrival').value,
        departure: input('departure').value,
        start: input('start').value,
        end: input('end').value,
        calculation: {
          type: kind,
          units:
            kind === 'daily'
              ? Number(input('nights').value)
              : kind === 'hourly'
                ? Number(input('hours').value)
                : 1,
          earlyHours: Number(input('early').value),
          lateHours: Number(input('late').value),
          surcharges,
        },
        rooms: [...page.querySelectorAll<HTMLInputElement>('[data-offer-room]:checked')].map(
          (box) => ({
            id: box.dataset.offerRoom!,
            price: priceInVND(
              page.querySelector<HTMLInputElement>(`[data-offer-price="${box.dataset.offerRoom}"]`)!
                .value,
            ),
          }),
        ),
      },
      catalog,
    );
    if (offer.arrival < todayInSaigon())
      throw new Error(t('Ngày đến đã qua. Vui lòng chọn ngày mới.'));
    return offer;
  }
  const errorMessage = (error: unknown) => {
    $('#offer-error').textContent =
      error instanceof Error ? t(error.message) : t('Vui lòng kiểm tra thông tin.');
  };
  function priceInVND(value: string): number {
    const amount = Number(value) * 1000;
    return Math.abs(amount - Math.round(amount)) < 0.000001 ? Math.round(amount) : NaN;
  }
  form.addEventListener('input', (event) => {
    invalidate();
    const target = targetElement(event);
    if (!target?.matches('[data-offer-price]')) return;
    const price = target as HTMLInputElement;
    const amount = priceInVND(price.value);
    const valid = Number.isSafeInteger(amount) && amount > 0 && amount <= 100000000;
    price.setCustomValidity(
      price.value && !valid ? t('Nhập giá theo nghìn VND, tối đa 3 chữ số thập phân.') : '',
    );
    price
      .closest('.offer-room-choice')!
      .querySelector<HTMLOutputElement>('[data-offer-price-display]')!.textContent =
      price.value && valid ? new Intl.NumberFormat('vi-VN').format(amount) + ' VND' : '';
  });
  form.addEventListener('change', (event) => {
    invalidate();
    const target = targetElement(event);
    if (target?.matches('[data-offer-room]')) {
      const box = target as HTMLInputElement;
      const row = box.closest<HTMLElement>('.offer-room-choice')!;
      const price = row.querySelector<HTMLInputElement>('[data-offer-price]')!;
      row.querySelector<HTMLElement>('.offer-room-price')!.hidden = !box.checked;
      price.disabled = !box.checked;
      price.required = box.checked;
    }
    $('#offer-selection-count').textContent =
      `${t('Số phòng đã chọn')}: ${page.querySelectorAll('[data-offer-room]:checked').length}`;
    if (target === type) {
      nightsEdited = false;
      syncSchedule(true);
    } else if (target === input('arrival') || target === input('departure')) syncSchedule();
  });
  input('nights').addEventListener('input', () => {
    nightsEdited = true;
  });
  $('#add-surcharge').addEventListener('click', () => {
    if (page.querySelectorAll('.offer-surcharge-row').length >= 5) return;
    $('#offer-surcharges').insertAdjacentHTML('beforeend', surchargeRow(feeIndex++));
    localize($('#offer-surcharges'));
    $<HTMLButtonElement>('#add-surcharge').disabled =
      page.querySelectorAll('.offer-surcharge-row').length >= 5;
    invalidate();
  });
  $('#offer-surcharges').addEventListener('click', (event) => {
    const remove = targetElement(event)?.closest('[data-remove-fee]');
    if (!remove) return;
    remove.closest('.offer-surcharge-row')!.remove();
    $<HTMLButtonElement>('#add-surcharge').disabled = false;
    invalidate();
  });
  $('#preview-offer').addEventListener('click', () => {
    invalidate();
    if (!form.reportValidity()) return;
    try {
      reviewed = readOffer();
      const token = encodeAvailability(reviewed, catalog);
      $('#offer-preview').innerHTML =
        `<h2>${t('Xem trước danh sách')}</h2>${availableView(reviewed, catalog, token, location.href)}`;
      $('#offer-preview').hidden = false;
      localize($('#offer-preview'));
      generate.disabled = false;
      $('#offer-preview').scrollIntoView({ behavior: 'instant', block: 'start' });
    } catch (error) {
      errorMessage(error);
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const offer = readOffer();
      if (!reviewed || JSON.stringify(reviewed) !== JSON.stringify(offer))
        throw new Error(t('Vui lòng xem trước danh sách sau khi thay đổi.'));
      const link = availabilityURL(location.href, encodeAvailability(offer, catalog));
      $<HTMLTextAreaElement>('#offer-link').value = link;
      $<HTMLAnchorElement>('#open-offer-link').href = link;
      $('#offer-output').hidden = false;
      await copy(link, $<HTMLTextAreaElement>('#offer-link'));
    } catch (error) {
      errorMessage(error);
    }
  });
  $('#copy-offer-link').addEventListener('click', () =>
    copy($<HTMLTextAreaElement>('#offer-link').value, $<HTMLTextAreaElement>('#offer-link')),
  );
  input('arrival').min = todayInSaigon();
  input('arrival').value = todayInSaigon();
  input('departure').value = nextDate(todayInSaigon());
  $('#offer-selection-count').textContent = `${t('Số phòng đã chọn')}: 0`;
  syncSchedule(true);
}
