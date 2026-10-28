import { offerNotice } from '../availability/availability-page';
import { type Availability } from '../availability/availability';
import { t } from '../../i18n';
import { roomCover, type Room, type Branch } from '../../domain/catalog';
import { esc, money } from '../../shared/dom';
import { mapLink } from '../../shared/config';

export function roomView(r: Room, b: Branch, offer?: Availability, offerToken?: string): string {
  const priceRows = (daily: boolean): string =>
    r.prices
      .filter((price) => (price.slot === 'daily') === daily)
      .map((price) => `<tr><td>${esc(price.label)}</td><td>${money(price.value)}</td></tr>`)
      .join('');
  return `<div class="breadcrumbs">
<a href="index.html">Trang chủ</a> / <a href="index.html?branch=${r.branch}#rooms">${esc(b.name)}</a> / ${esc(r.name)}</div>
<div class="detail-heading">
<div>
<h1>${esc(r.name)} · ${esc(b.name)}</h1>
<p>${esc(b.address || 'Liên hệ Nov để nhận địa chỉ chi nhánh')}</p>
</div>
<button class="button" id="share-room">Chia sẻ ↗</button>
</div>
<div class="gallery">
<div class="gallery-main">
<img id="gallery-image" src="${encodeURI(roomCover(r))}" alt="${esc(r.name)} — Ảnh 1">
<div class="gallery-controls">
<button id="previous-photo" aria-label="Ảnh trước">←</button>
<span class="gallery-counter" aria-live="polite">1 / ${r.images.length}</span>
<button id="next-photo" aria-label="Ảnh tiếp theo">→</button>
</div>
</div>
<div class="thumbnails" aria-label="Chọn ảnh phòng">${r.images
    .map(
      (
        img,
        i,
      ) => `<button data-photo="${i}" aria-label="Xem ảnh ${i + 1}" aria-pressed="${i === 0}">
<img src="${encodeURI(img)}" alt="" loading="lazy">
</button>`,
    )
    .join('')}</div>
</div>
<div class="detail-layout">
<div>
<div class="detail-block">
<p class="eyebrow">MAKE YOURSELF AT HOME</p>
<h2>Thông tin phòng</h2>
<p>${esc(r.description)}</p>
<ul class="overview">${r.overview.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
</div>
<div class="detail-block">
<h2>Tiện nghi trong phòng</h2>
<ul class="amenities">${r.amenities.length ? r.amenities.map((a) => `<li>${esc(a)}</li>`).join('') : '<li>Liên hệ Nov để được tư vấn tiện nghi phòng.</li>'}</ul>
</div>
<div class="detail-block">
<h2>Vị trí</h2>
<p>${esc(b.address)}</p>
${b.address ? `<a class="underlink" href="${mapLink(b)}" target="_blank" rel="noopener">Mở chỉ đường trên Google Maps ↗</a>` : `<a class="underlink" href="https://zalo.me/0703277997" target="_blank" rel="noopener">Nhắn Nov để nhận địa chỉ ↗</a><a class="underlink" href="https://wa.me/84703277997" target="_blank" rel="noopener">Nhắn Nov qua WhatsApp ↗</a>`}
</div>
<div class="detail-block">
<h2>Trước khi đặt phòng</h2>
<p>Vui lòng liên hệ Nov để kiểm tra lịch trống, giá và điều kiện áp dụng cho ngày bạn chọn. Phòng chỉ được giữ sau khi home nhận cọc hoặc thanh toán.</p>
<a class="underlink" href="index.html?page=rules">Xem nội quy lưu trú ↗</a><br><a class="underlink" href="index.html#faq">Xem hướng dẫn & chính sách ↗</a>
</div>
<a class="back-link" href="index.html?branch=${r.branch}#rooms">← Khám phá phòng khác tại ${esc(b.name)}</a>
</div>
<aside class="price-panel" id="room-prices">
${offer && offerToken ? `<div class="room-offer"><a class="underlink" href="./?s=${encodeURIComponent(offerToken)}">${t('← Danh sách phòng Nov gửi')}</a><h3>${t('Tổng cộng')}: ${money(offer.rooms.find((row) => row.id === r.id)!.price)}</h3>${offerNotice(offer)}</div>` : ''}
<h2 class="price-panel-title">Giá &amp; khung giờ</h2>
<table class="price-table"><caption class="price-group-title">Giá theo ngày</caption><tbody>${priceRows(true)}</tbody></table>
<table class="price-table"><caption class="price-group-title">Giá theo giờ</caption><tbody>${priceRows(false)}</tbody></table>
<ul class="price-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
<div class="booking-fields">
<label>Ngày dự kiến đến<input type="date" id="request-date" required>
</label>
<label>Ngày dự kiến đi<input type="date" id="request-checkout" required></label>
<label>Khung giờ<select id="request-slot"><option value="Theo giờ">Theo giờ</option><option value="Qua đêm (21h-9h)">Qua đêm (21h-9h)</option><option value="Theo ngày (14h-12h)" selected>Theo ngày (14h-12h)</option></select>
</label>
</div>
<p id="request-status" class="availability-note" role="status" aria-live="polite"></p>
<p class="request-preview" id="request-preview">
</p>
<button class="button" id="copy-request">Sao chép tin nhắn hỏi phòng</button>
<textarea class="copy-fallback" aria-label="Tin nhắn hỏi phòng — chọn và sao chép" hidden readonly>
</textarea>
<a class="button cream" href="https://zalo.me/0703277997" target="_blank" rel="noopener">Mở Zalo của Nov ↗</a><a class="button cream" href="https://wa.me/84703277997" target="_blank" rel="noopener">Nhắn Nov qua WhatsApp ↗</a>
<p class="availability-note">Sao chép tin nhắn rồi dán vào Zalo hoặc WhatsApp. Nov sẽ kiểm tra và xác nhận; thao tác này chưa tạo booking.</p>
</aside>
</div>`;
}
