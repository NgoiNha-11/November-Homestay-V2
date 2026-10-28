import { decodeAvailability, type Availability } from '../availability/availability';
import { t } from '../../i18n';
import type { Catalog } from '../../domain/catalog';
import { $ } from '../../shared/dom';
import { roomView } from './room-view';
import { mountGallery } from './gallery';
import { mountInquiry } from './booking-inquiry';

export function mountRoom(catalog: Catalog, id: string, offerToken?: string): void {
  $('#home').hidden = true;
  const detail = $('#room-detail');
  detail.hidden = false;
  const room = catalog.rooms.find((room) => room.id === id);
  if (!room) {
    document.title = 'Không tìm thấy phòng — November Homestay';
    detail.innerHTML =
      '<h1>Không tìm thấy phòng</h1><p>Căn phòng bạn tìm chưa có trong danh sách hiện tại.</p><a class="button" href="index.html#rooms">Khám phá các phòng khác</a>';
    return;
  }
  let offer: Availability | undefined;
  if (offerToken) {
    try {
      offer = decodeAvailability(offerToken, catalog);
      if (!offer.rooms.some((row) => row.id === id)) throw new Error();
    } catch {
      detail.innerHTML =
        '<h1>' +
        t('Không mở được danh sách') +
        '</h1><p>' +
        t(
          'Link danh sách không hợp lệ hoặc đã bị thiếu nội dung. Bạn vui lòng xin Nov gửi lại link.',
        ) +
        '</p>';
      return;
    }
  }
  const branch = catalog.branches.find((branch) => branch.id === room.branch)!;
  document.title = room.name + ' · ' + branch.name + ' — November Homestay';
  detail.innerHTML = roomView(room, branch, offer, offerToken);
  mountGallery(room);
  mountInquiry(room, branch, offer);
}
