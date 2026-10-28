import { $, esc } from '../../shared/dom';
import { houseRules } from '../../data/house-rules';

export function mountRules(): void {
  $('#home').hidden = true;
  const page = $('#rules-page');
  page.hidden = false;
  document.title = 'Nội quy của home — November Homestay';
  page.innerHTML = `
    <div class="breadcrumbs"><a href="index.html">Trang chủ</a> / Nội quy của home</div>
    <div class="rules-heading"><p class="eyebrow">A LITTLE CARE, A LOVELY STAY</p>
    <h1>Nội quy của home</h1><p>Một vài lưu ý để khoảng nghỉ tại Nov luôn dễ chịu.</p></div>
    <div class="rules-grid">${houseRules.map((rule, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><h2>${esc(rule.title)}</h2><p>${esc(rule.text)}</p></article>`).join('')}</div>
    <div class="rules-contact"><h2>Cảm ơn bạn đã tuân thủ nội quy.</h2><p>November Homestay mong bạn sẽ có một kỳ nghỉ thật tuyệt vời! ✨</p>
    <a class="button" href="https://zalo.me/0703277997" target="_blank" rel="noopener">Hỏi Nov qua Zalo ↗</a><a class="button cream" href="https://wa.me/84703277997" target="_blank" rel="noopener">Nhắn Nov qua WhatsApp ↗</a>
    <a class="underlink" href="index.html#faq">Chính sách đặt phòng, hoàn hủy ↗</a></div>`;
}
