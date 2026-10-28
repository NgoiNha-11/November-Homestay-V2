import { translateText } from '../i18n/translations';
/** Stable IDs keep catalog relationships and shared room links consistent. Amounts are integer VND. */
export type StaySlot = 'morning' | 'afternoon' | 'overnight' | 'daily';
export interface Branch {
  id: string;
  name: string;
  address: string;
  cover: string;
  roomCount: number;
  floors: number;
  overview: string;
  facilities: string[];
}
export interface RoomPrice {
  slot: StaySlot;
  label: string;
  value: number;
}
export interface Room {
  id: string;
  branch: string;
  name: string;
  description: string;
  images: string[];
  prices: RoomPrice[];
  notes: string[];
  amenities: string[];
  overview: string[];
}
export interface Catalog {
  branches: Branch[];
  rooms: Room[];
}
export interface CatalogRepository {
  load(): Promise<Catalog>;
}
export const staySlots: StaySlot[] = ['morning', 'afternoon', 'overnight', 'daily'];
export function priceFor(room: Room, slot: StaySlot): RoomPrice | undefined {
  return room.prices.find((price) => price.slot === slot);
}
export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export interface RoomFilters {
  query: string;
  branchId: string;
  maxPrice?: number;
  amenities: string[];
  favoritesOnly: boolean;
  favorites: ReadonlySet<string>;
  sort: 'default' | 'asc' | 'desc';
}
export function filterRooms(catalog: Catalog, filters: RoomFilters): Room[] {
  const terms = normalize(filters.query.trim()).split(/\s+/);
  const result = catalog.rooms.filter((room) => {
    const branch = catalog.branches.find((branch) => branch.id === room.branch);
    const text = normalize(
      [
        room.id,
        room.name,
        branch?.name ?? '',
        room.description,
        ...room.amenities,
        ...room.overview,
      ]
        .flatMap((value) => [value, translateText(value, 'en')])
        .join(' '),
    );
    const price = startingPrice(room);
    return (
      price !== undefined &&
      terms.every((term) => text.includes(term)) &&
      (!filters.branchId || room.branch === filters.branchId) &&
      price.value <= (filters.maxPrice ?? Infinity) &&
      filters.amenities.every((amenity) => text.includes(normalize(amenity))) &&
      (!filters.favoritesOnly || filters.favorites.has(room.id))
    );
  });
  if (filters.sort !== 'default') {
    result.sort(
      (a, b) =>
        (filters.sort === 'asc' ? 1 : -1) * (startingPrice(a).value - startingPrice(b).value),
    );
  }
  return result;
}
export function validateCatalog(catalog: Catalog): void {
  const branches = new Set(catalog.branches.map((b) => b.id));
  if (branches.size !== catalog.branches.length) throw new Error('Duplicate branch ID');
  const ids = new Set<string>();
  for (const room of catalog.rooms) {
    if (ids.has(room.id) || !branches.has(room.branch)) throw new Error(`Invalid room: ${room.id}`);
    ids.add(room.id);
    if (
      !room.images.length ||
      new Set(room.prices.map((p) => p.slot)).size !== staySlots.length ||
      !staySlots.every((slot) => room.prices.some((p) => p.slot === slot))
    )
      throw new Error(`Incomplete room: ${room.id}`);
    for (const price of room.prices)
      if (!Number.isSafeInteger(price.value) || price.value < 0)
        throw new Error(`Invalid VND price: ${room.id}`);
  }
}

/** Listing prices use the lowest available rate; full time-specific prices remain on the room page. */
export function startingPrice(room: Room): RoomPrice {
  return room.prices.reduce((lowest, price) => (price.value < lowest.value ? price : lowest));
}
export function roomCover(room: Room): string {
  return room.images.find((image) => /\(1\)\.[^/]+$/.test(image)) ?? room.images[0];
}
