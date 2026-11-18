import {errorStatus} from '../api-read';
import type {SavedList} from '../member-api';

/** W13 named lists (web-13): name 1–60 characters, at most 20 lists, 100 services each. */
export const LIST_NAME_MAX = 60;
export const LIST_LIMIT = 20;
export const LIST_ITEM_LIMIT = 100;

/** A chip on /kaydedilenler, demo or live. */
export type SavedChip = {id: string; name: string; ids: string[]; source?: SavedList};

export function listNameError(name: string, max = LIST_NAME_MAX) {
  const value = name.trim();
  if (!value) return 'Listeye bir ad ver.';
  if (value.length > max) return `Liste adı en çok ${max} karakter olabilir.`;
  return '';
}

/** Live chips: named lists only (saved comparisons belong to /karsilastir), in server order. */
export function liveChips(lists: SavedList[]): SavedChip[] {
  return lists.filter((l) => l.kind === 'list').map((l) => ({id: l.id, name: l.name, ids: l.businessIds, source: l}));
}

/** Readable message for a failed /api/me/lists call. */
export function listErrorMessage(error: unknown) {
  switch (errorStatus(error)) {
    case 400: return 'Liste kaydedilemedi. Ad 1–60 karakter olmalı; listeye yalnız yayındaki servisler eklenebilir.';
    case 401: return 'Oturum süresi doldu. Yeniden giriş yap.';
    case 403: return 'Önce e-posta adresini doğrula.';
    case 404: return 'Liste bulunamadı; başka bir yerde silinmiş olabilir. Listeleri yenile.';
    case 409: return 'Liste başka bir yerde değişti ya da sınıra ulaştı (en çok 20 liste, listede 100 servis). Yenileyip tekrar dene.';
    case 429: return 'Çok fazla işlem yapıldı. Biraz sonra tekrar dene.';
    case 503: return 'Listeler şu anda kullanılamıyor.';
    default: return error instanceof Error && error.message ? error.message : 'Liste işlemi tamamlanamadı. Tekrar dene.';
  }
}

/** Puts `next` in place of the list with the same id (or appends it). */
export function replaceList(lists: SavedList[], next: SavedList) {
  return lists.some((l) => l.id === next.id) ? lists.map((l) => (l.id === next.id ? next : l)) : [...lists, next];
}

/** Runs `task` over `items` with at most `limit` in flight. */
export async function eachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let index = 0;
  const worker = async () => {
    while (index < items.length) {
      const item = items[index++]!;
      await task(item);
    }
  };
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
}

// Turkish accusative after a numeral: 1’i, 2’si, 3’ü, 6’sı, 10’u, 40’ı …
export function accusative(n: number) {
  if (n % 100 === 0) return 'ü';
  const ones = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  return n % 10 ? ones[n % 10]! : tens[Math.floor(n / 10) % 10]!;
}
