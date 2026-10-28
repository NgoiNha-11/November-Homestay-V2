import { heartIcon } from '../../shared/icons';
import { branchView } from './branch-view';
import { localize, t } from '../../i18n';
import {
  filterRooms,
  startingPrice,
  roomCover,
  type Catalog,
  type RoomFilters,
} from '../../domain/catalog';
import { loadFavorites, persistFavorites } from '../../data/favorites-storage';
import { $, esc, money, targetElement, toast } from '../../shared/dom';

export function mountCatalog(catalog: Catalog, initialBranch: string): void {
  const favorites = loadFavorites(new Set(catalog.rooms.map((room) => room.id)));
  const selectedAmenities = new Set<string>();
  let favoritesOnly = false;
  const search = $<HTMLInputElement>('#search');
  const branch = $<HTMLSelectElement>('#branch');
  const budget = $<HTMLSelectElement>('#budget');
  const sort = $<HTMLSelectElement>('#sort');
  // Render branch choices from the same data used by room cards and branch sections.
  branch.innerHTML =
    '<option value="">Tất cả chi nhánh</option>' +
    catalog.branches.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');
  if (catalog.branches.some((b) => b.id === initialBranch)) branch.value = initialBranch;
  function updateFavorites(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach((button) => {
      const saved = favorites.has(button.dataset.favorite!);
      button.innerHTML = heartIcon(saved);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute(
        'aria-label',
        t((saved ? 'Bỏ lưu ' : 'Lưu ') + button.dataset.favorite!.toUpperCase()),
      );
    });
    $('#favorite-count').textContent = String(favorites.size);
  }
  function render(): void {
    const filters: RoomFilters = {
      query: search.value,
      branchId: branch.value,
      maxPrice: Number(budget.value) || undefined,
      amenities: [...selectedAmenities],
      favoritesOnly,
      favorites,
      sort: sort.value as RoomFilters['sort'],
    };
    const rooms = filterRooms(catalog, filters);
    $('#result-count').textContent =
      `${rooms.length} căn phòng ${favoritesOnly ? 'đã lưu' : 'dành cho bạn'}`;
    $('#empty').hidden = rooms.length > 0;
    $('#room-grid').innerHTML = rooms
      .map((room) => {
        const branch = catalog.branches.find((branch) => branch.id === room.branch)!;
        const price = startingPrice(room);
        const url = `index.html?room=${encodeURIComponent(room.id)}`;
        return `<article class="room-card"><button type="button" class="favorite" data-favorite="${esc(room.id)}"></button><a class="room-image" href="${url}" aria-label="Xem ${esc(room.name)} tại ${esc(branch.name)}"><img src="${encodeURI(roomCover(room))}" alt="${esc(room.name + ' · ' + branch.name)}" loading="lazy" width="600" height="800"><span class="room-tag">${esc(branch.name)}</span></a><div class="card-top"><h3><a href="${url}">${esc(room.name)}</a></h3><a href="${url}" aria-label="Chi tiết ${esc(room.id)}">↗</a></div><p class="room-desc">${esc(room.description)}</p><div class="card-bottom"><span class="price"><small>Từ </small>${money(price.value)}</span><a class="slot" href="${url}#room-prices">Xem bảng giá ↗</a></div></article>`;
      })
      .join('');
    updateFavorites();
    localize($('#rooms'));
  }
  function reset(): void {
    $<HTMLFormElement>('#filters').reset();
    sort.value = 'default';
    selectedAmenities.clear();
    favoritesOnly = false;
    document
      .querySelectorAll('.amenity-filters button')
      .forEach((button) => button.setAttribute('aria-pressed', 'false'));
    render();
  }
  $('#filters').addEventListener('submit', (event) => {
    event.preventDefault();
    render();
    $('#result-count').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  search.addEventListener('input', render);
  [branch, budget, sort].forEach((input) => input.addEventListener('change', render));
  $('#clear').addEventListener('click', reset);
  $('#empty-reset').addEventListener('click', reset);
  $('.amenity-filters').addEventListener('click', (event) => {
    const button = targetElement(event)?.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.id === 'favorite-filter') {
      favoritesOnly = !favoritesOnly;
      button.setAttribute('aria-pressed', String(favoritesOnly));
    } else if (button.dataset.amenity) {
      const amenity = button.dataset.amenity;
      selectedAmenities.has(amenity)
        ? selectedAmenities.delete(amenity)
        : selectedAmenities.add(amenity);
      button.setAttribute('aria-pressed', String(selectedAmenities.has(amenity)));
    }
    render();
  });
  $('#room-grid').addEventListener('click', (event) => {
    const button = targetElement(event)?.closest<HTMLButtonElement>('[data-favorite]');
    if (!button?.dataset.favorite) return;
    const id = button.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    if (!persistFavorites(favorites))
      toast('Phòng được lưu trong phiên này. Trình duyệt chưa cho phép lưu lâu dài.');
    favoritesOnly ? render() : updateFavorites();
  });
  $('#branch-grid').innerHTML = catalog.branches.map(branchView).join('');
  $('#branch-grid').addEventListener('click', (event) => {
    const toggle = targetElement(event)?.closest<HTMLButtonElement>('.branch-overview-toggle');
    if (toggle) {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = t(expanded ? 'Thu gọn' : 'Xem thêm');
      document
        .getElementById(toggle.getAttribute('aria-controls')!)
        ?.classList.toggle('is-expanded', expanded);
      return;
    }
    const link = targetElement(event)?.closest<HTMLAnchorElement>('[data-branch]');
    if (!link?.dataset.branch) return;
    event.preventDefault();
    reset();
    branch.value = link.dataset.branch;
    render();
    const url = new URL(location.href);
    url.searchParams.set('branch', branch.value);
    url.hash = 'rooms';
    history.replaceState(null, '', url);
    $('#rooms').scrollIntoView();
  });
  document.querySelector('.intro-strip a')!.textContent =
    `Khám phá ${catalog.rooms.length} phòng ↓`;
  render();
}
