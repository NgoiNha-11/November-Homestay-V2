import { normalize, type Catalog } from '../../domain/catalog';
import { todayInSaigon } from '../../shared/config';

export interface Availability {
  v: 1;
  arrival: string;
  departure: string;
  start: string;
  end: string;
  rooms: { id: string; price: number }[];
  calculation?: OfferCalculation;
}
export type StayType = 'hourly' | 'overnight' | 'daily' | 'other';
export interface OfferCalculation {
  type: StayType;
  units: number;
  earlyHours: number;
  lateHours: number;
  surcharges: { reason: string; percent: number }[];
}
export const stayTypes: StayType[] = ['hourly', 'overnight', 'daily', 'other'];
/** These are actual arrival/departure dates, independent of billable nights. */
export function stayNights(arrival: string, departure: string): number {
  return Math.max(
    1,
    (Date.parse(departure + 'T00:00:00Z') - Date.parse(arrival + 'T00:00:00Z')) / 86_400_000,
  );
}
export interface ParsedAvailability {
  arrival: string;
  departure: string;
  start: string;
  end: string;
  rooms: Availability['rooms'];
  issues: string[];
  inferredYear: boolean;
}
export const validDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
export function nextDate(value: string): string {
  if (!validDate(value)) return '';
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function slotLabel(offer: Pick<Availability, 'start' | 'end'>): string {
  return `${offer.start}–${offer.end}`;
}
export function displayDate(date: string): string {
  return date.split('-').reverse().join('/');
}
export function validateAvailability(value: unknown, catalog: Catalog): Availability {
  if (!value || typeof value !== 'object') throw new Error('Danh sách không hợp lệ.');
  const o = value as Availability;
  if (
    o.v !== 1 ||
    typeof o.arrival !== 'string' ||
    typeof o.departure !== 'string' ||
    !validDate(o.arrival) ||
    !validDate(o.departure) ||
    o.departure < o.arrival ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(o.start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(o.end) ||
    (o.departure === o.arrival && o.end <= o.start) ||
    !Array.isArray(o.rooms) ||
    !o.rooms.length ||
    o.rooms.length > catalog.rooms.length
  )
    throw new Error('Kiểm tra ngày đến, ngày đi, khung giờ và danh sách phòng.');
  const ids = new Set<string>();
  for (const row of o.rooms) {
    if (
      !row ||
      !catalog.rooms.some((r) => r.id === row.id) ||
      ids.has(row.id) ||
      !Number.isSafeInteger(row.price) ||
      row.price <= 0 ||
      row.price > 100_000_000
    )
      throw new Error('Mã phòng bị trùng, không tồn tại hoặc giá không hợp lệ.');
    ids.add(row.id);
  }
  let calculation: OfferCalculation | undefined;
  if (o.calculation !== undefined) {
    const c = o.calculation;
    const quarterHours = (n: number) =>
      Number.isFinite(n) && n >= 0 && n <= 168 && Number.isInteger(n * 4);
    if (
      !c ||
      !stayTypes.includes(c.type) ||
      !quarterHours(c.earlyHours) ||
      !quarterHours(c.lateHours) ||
      (c.type === 'hourly'
        ? !quarterHours(c.units) || c.units === 0
        : c.type === 'daily'
          ? !Number.isInteger(c.units) || c.units < 1 || c.units > 3650
          : c.units !== 1) ||
      !Array.isArray(c.surcharges) ||
      c.surcharges.length > 5
    )
      throw new Error('Kiểm tra loại lưu trú, số đêm, số giờ và extra (bước 0,25 giờ).');
    const duration =
      (Date.parse(o.departure + 'T' + o.end + ':00Z') -
        Date.parse(o.arrival + 'T' + o.start + ':00Z')) /
      3_600_000;
    if (
      c.earlyHours + c.lateHours >= duration ||
      ((c.type === 'daily' || c.type === 'overnight') && o.departure <= o.arrival)
    )
      throw new Error('Kiểm tra ngày đi và extra: extra phải ngắn hơn toàn bộ thời gian lưu trú.');
    for (const fee of c.surcharges) {
      if (
        !fee ||
        typeof fee.reason !== 'string' ||
        !fee.reason.trim() ||
        [...fee.reason.trim()].length > 80 ||
        !Number.isFinite(fee.percent) ||
        fee.percent <= 0 ||
        fee.percent > 100 ||
        Math.abs(fee.percent * 100 - Math.round(fee.percent * 100)) > 0.000001
      )
        throw new Error(
          'Phụ thu cần lý do (tối đa 80 ký tự) và tỷ lệ trên 0% đến 100% (tối đa 2 số lẻ).',
        );
    }
    calculation = {
      type: c.type,
      units: c.units,
      earlyHours: c.earlyHours,
      lateHours: c.lateHours,
      surcharges: c.surcharges.map((fee) => ({ reason: fee.reason.trim(), percent: fee.percent })),
    };
  }
  return {
    v: 1,
    arrival: o.arrival,
    departure: o.departure,
    start: o.start,
    end: o.end,
    rooms: o.rooms.map((row) => ({ id: row.id, price: row.price })),
    ...(calculation ? { calculation } : {}),
  };
}
// Append only: these wire IDs must never change when the catalog is reordered.
const linkRooms = [
  'dbp101',
  'dbp201',
  'dbp202',
  'dbp301',
  'dbp302',
  'dbp401',
  'pn101',
  'pn201',
  'hs102',
  'hs201',
  'hs202',
  'hs301',
  'hs302',
  'hs401',
  'hs501',
  'hbt101',
  'hbt102',
  'hbt201',
  'hbt301',
  'hbtg01',
];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const dayMs = 86_400_000;
export function encodeAvailability(offer: Availability, catalog: Catalog): string {
  const o = validateAvailability(offer, catalog);
  let bits = '';
  const put = (value: number, width: number) => {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** width)
      throw new Error('Dữ liệu vượt giới hạn tạo link.');
    bits += value.toString(2).padStart(width, '0');
  };
  const variable = (value: number) => {
    while (value >= 128) {
      put((value % 128) + 128, 8);
      value = Math.floor(value / 128);
    }
    put(value, 8);
  };
  const arrival = Date.parse(o.arrival + 'T00:00:00Z') / dayMs;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  put(4, 3); // Compact form-based offers, including optional calculation details.
  const recent = arrival >= 18262 && arrival < 18262 + 65536;
  put(Number(recent), 1);
  put(recent ? arrival - 18262 : arrival + 719528, recent ? 16 : 22);
  const nights = Date.parse(o.departure + 'T00:00:00Z') / dayMs - arrival;
  put(Number(nights <= 1), 1);
  if (nights <= 1) put(nights, 1);
  else variable(nights);
  const hourly = minutes(o.start) % 60 === 0 && minutes(o.end) % 60 === 0;
  put(Number(hourly), 1);
  put(minutes(o.start) / (hourly ? 60 : 1), hourly ? 5 : 11);
  put(minutes(o.end) / (hourly ? 60 : 1), hourly ? 5 : 11);
  put(o.rooms.length - 1, 5);
  const prices = [...new Set(o.rooms.map((r) => r.price))].sort((a, b) => a - b);
  const thousands = prices.every((price) => price % 1000 === 0);
  put(Number(thousands), 1);
  put(prices.length - 1, 5);
  let previousPrice = 0;
  for (const price of prices) {
    variable((price - previousPrice) / (thousands ? 1000 : 1));
    previousPrice = price;
  }
  const priceBits = Math.ceil(Math.log2(prices.length));
  for (const room of o.rooms) {
    const id = linkRooms.indexOf(room.id);
    if (id < 0) throw new Error('Mã phòng không hỗ trợ tạo link.');
    put(id, 5);
    if (priceBits) put(prices.indexOf(room.price), priceBits);
  }
  put(Number(!!o.calculation), 1);
  if (o.calculation) {
    const c = o.calculation;
    put(stayTypes.indexOf(c.type), 2);
    if (c.type === 'daily' || c.type === 'hourly')
      variable(c.units * (c.type === 'hourly' ? 4 : 1));
    for (const hours of [c.earlyHours, c.lateHours]) {
      put(Number(hours > 0), 1);
      if (hours) variable(hours * 4);
    }
    put(c.surcharges.length, 3);
    for (const fee of c.surcharges) {
      variable(Math.round(fee.percent * 100));
      const bytes = new TextEncoder().encode(fee.reason);
      variable(bytes.length);
      for (const byte of bytes) put(byte, 8);
    }
  }
  bits = bits.padEnd(Math.ceil(bits.length / 6) * 6, '0');
  return bits
    .match(/.{6}/g)!
    .map((part) => alphabet[parseInt(part, 2)])
    .join('');
}
export function decodeAvailability(token: string, catalog: Catalog): Availability {
  try {
    if (!token || token.length > 4096 || !/^[\w-]+$/.test(token)) throw new Error();
    const bits = [...token]
      .map((char) => alphabet.indexOf(char).toString(2).padStart(6, '0'))
      .join('');
    let cursor = 0;
    const get = (width: number) => {
      if (cursor + width > bits.length) throw new Error();
      const value = parseInt(bits.slice(cursor, cursor + width), 2);
      cursor += width;
      return value;
    };
    const variable = () => {
      let value = 0;
      for (let i = 0; i < 5; i++) {
        const byte = get(8);
        value += (byte & 127) * 128 ** i;
        if (byte < 128) return value;
      }
      throw new Error();
    };
    if (get(3) !== 4) throw new Error();
    const recent = get(1) === 1;
    const arrival = recent ? get(16) + 18262 : get(22) - 719528;
    const departure = arrival + (get(1) === 1 ? get(1) : variable());
    const hourly = get(1) === 1;
    const time = () => {
      const minutes = get(hourly ? 5 : 11) * (hourly ? 60 : 1);
      if (minutes >= 1440) throw new Error();
      return (
        String(Math.floor(minutes / 60)).padStart(2, '0') +
        ':' +
        String(minutes % 60).padStart(2, '0')
      );
    };
    const start = time();
    const end = time();
    const count = get(5) + 1;
    const thousands = get(1) === 1;
    const priceCount = get(5) + 1;
    if (count > catalog.rooms.length || priceCount > count) throw new Error();
    let previousPrice = 0;
    const prices = Array.from({ length: priceCount }, () => {
      previousPrice += variable() * (thousands ? 1000 : 1);
      return previousPrice;
    });
    const priceBits = Math.ceil(Math.log2(priceCount));
    const rooms = Array.from({ length: count }, () => ({
      id: linkRooms[get(5)],
      price: prices[priceBits ? get(priceBits) : 0],
    }));
    let calculation: OfferCalculation | undefined;
    if (get(1)) {
      const type = stayTypes[get(2)];
      const units =
        type === 'daily' || type === 'hourly' ? variable() / (type === 'hourly' ? 4 : 1) : 1;
      const earlyHours = get(1) ? variable() / 4 : 0;
      const lateHours = get(1) ? variable() / 4 : 0;
      const fees = get(3);
      if (fees > 5) throw new Error();
      const surcharges = Array.from({ length: fees }, () => {
        const percent = variable() / 100;
        const length = variable();
        if (!length || length > 320) throw new Error();
        const bytes = Uint8Array.from({ length }, () => get(8));
        return { reason: new TextDecoder('utf-8', { fatal: true }).decode(bytes), percent };
      });
      calculation = { type, units, earlyHours, lateHours, surcharges };
    }
    const date = (days: number) => new Date(days * dayMs).toISOString().slice(0, 10);
    const offer = validateAvailability(
      {
        v: 1,
        arrival: date(arrival),
        departure: date(departure),
        start,
        end,
        rooms,
        ...(calculation ? { calculation } : {}),
      },
      catalog,
    );
    // Reject extra data, truncation, noncanonical padding and redundant price tables.
    if (encodeAvailability(offer, catalog) !== token) throw new Error();
    return offer;
  } catch {
    throw new Error(
      'Link danh sách không hợp lệ hoặc đã bị thiếu nội dung. Bạn vui lòng xin Nov gửi lại link.',
    );
  }
}
export function availabilityURL(base: string, token: string, roomId?: string): string {
  const url = new URL('./', base);
  if (roomId) url.searchParams.set('room', roomId);
  url.searchParams.set('s', token);
  return url.href;
}
export function parseAvailability(
  text: string,
  catalog: Catalog,
  today = todayInSaigon(),
): ParsedAvailability {
  const result: ParsedAvailability = {
    arrival: '',
    departure: '',
    start: '',
    end: '',
    rooms: [],
    issues: [],
    inferredYear: false,
  };
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalize(line).trim())
    .filter(Boolean);
  const dateLine = lines.find(
    (line) =>
      /\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/.test(line) && /\b\d{1,2}\/(?:0?[1-9]|1[0-2])\b/.test(line),
  );
  const match = dateLine?.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (match) {
    let year = Number(match[3] || today.slice(0, 4));
    const date = () => `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    if (!match[3] && date() < today && validDate(date())) year++;
    result.arrival = validDate(date()) ? date() : '';
    result.inferredYear = !match[3];
  }
  const times = lines
    .join(' ')
    .match(/\b(\d{1,2})(?:h|:)(\d{2})?\s*[-–—]\s*(\d{1,2})(?:h|:)(\d{2})?/);
  if (times) {
    result.start = `${times[1].padStart(2, '0')}:${times[2] || '00'}`;
    result.end = `${times[3].padStart(2, '0')}:${times[4] || '00'}`;
  }
  result.departure =
    result.end <= result.start || lines.some((l) => l.includes('hom sau'))
      ? nextDate(result.arrival)
      : result.arrival;
  let branch = '';
  for (const line of lines) {
    const header = catalog.branches.find((b) => line.includes(normalize(b.name)));
    if (header && !/\d{3}|g01/.test(line)) {
      branch = header.id;
      continue;
    }
    const row = line.match(
      /^[-•*\s]*(?:(dbp|hs|hbt|pn)\s*)?((?:g01|\d{3})(?:\s*[/,]\s*(?:g01|\d{3}))*)\s*:\s*([\d.,]+)\s*(k|nghin|ngan|vnd|vnđ|d|đ)?(?:\s|$)/,
    );
    if (!row) {
      if (/^[-•*]|(?:hs|hbt|dbp|pn)\s*(?:\d{3}|g01)|\b(?:\d{3}|g01)\s*:/.test(line))
        result.issues.push(`Chưa đọc được dòng: ${line}`);
      continue;
    }
    const prefix = row[1] || branch;
    const amount = Number(row[3].replace(/[.,]/g, ''));
    const price = /^(k|nghin|ngan)$/.test(row[4] || '') ? amount * 1000 : amount;
    if (!prefix || !Number.isSafeInteger(price) || price < 10000) {
      result.issues.push(`Kiểm tra chi nhánh hoặc giá (ghi 450k hoặc 450000): ${line}`);
      continue;
    }
    for (const number of row[2].split(/[/,]/).map((s) => s.trim())) {
      const id = prefix + number;
      if (!catalog.rooms.some((r) => r.id === id)) {
        result.issues.push(`Không tìm thấy phòng ${id.toUpperCase()}.`);
        continue;
      }
      const prior = result.rooms.find((r) => r.id === id);
      if (prior) {
        result.issues.push(`Phòng ${id.toUpperCase()} xuất hiện nhiều lần. Vui lòng giữ một giá.`);
        continue;
      }
      result.rooms.push({ id, price });
    }
  }
  return result;
}
