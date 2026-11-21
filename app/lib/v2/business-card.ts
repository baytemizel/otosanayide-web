import {categories, type Business} from '@otosanayide/core';
import type {MockBusiness} from '~/data/mock/businesses';
import {turkish, type Translate} from '~/lib/i18n';
import {openState, type OpeningHours} from '~/lib/opening-hours';
import type {BusinessExtras} from '~/lib/search-response';

/**
 * View model of a service card / profile head (V2/Kart/Servis). Demo data (app/data/mock) already has
 * this shape; live data comes from `toCardBusiness`. `source` keeps the API record for screens that need more.
 */
export type CardBusiness = MockBusiness & {
  hoursKnown?: boolean;
  /** False when only free-text hours exist: the text is shown, but open/closed is not claimed. */
  openStateKnown?: boolean;
  coords?: {latitude: number; longitude: number};
  source?: Business;
  extras?: BusinessExtras;
};

const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

/** Dative suffix for a clock time read aloud in Turkish ("19.00’a", "18.00’e", "20.00’ye"). */
export function dativeTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const spoken = m ? m : h;
  const units = ['a', 'e', 'ye', 'e', 'e', 'e', 'ya', 'ye', 'e', 'a']; // sıfır bir iki üç dört beş altı yedi sekiz dokuz
  const tens = ['', 'a', 'ye', 'a', 'a', 'ye']; // on yirmi otuz kırk elli
  const suffix = spoken % 10 ? units[spoken % 10] : spoken === 0 ? 'a' : tens[Math.floor(spoken / 10)];
  return `${hhmm.replace(':', '.')}’${suffix}`;
}

/**
 * "Açık · 19.00’a kadar" / "Kapalı · 08.30 açılır" style text from structured hours. `t` and the locale tag
 * pick the language: Turkish reads the time with its dative suffix ("19.00’a"), English as "19:00".
 */
export function hoursState(hours: OpeningHours | undefined, now = new Date(), t: Translate = turkish, localeTag = 'tr-TR'): {known: boolean; open: boolean; text: string} {
  if (!hours) return {known: false, open: false, text: t('Saat bilgisi yok')};
  const state = openState(hours, now);
  const tr = localeTag.startsWith('tr');
  if (state.open) {
    const until = state.until === '24:00' ? '00:00' : state.until;
    return {known: true, open: true, text: t('Açık · {time} kadar', {time: tr ? dativeTime(until) : until})};
  }
  return {known: true, open: false, text: state.opensAt ? t('Kapalı · {time} açılır', {time: tr ? state.opensAt.replace(':', '.') : state.opensAt}) : t('Bugün kapalı')};
}

export function toCardBusiness(business: Business, extras: BusinessExtras = {}, now = new Date(), t: Translate = turkish, localeTag = 'tr-TR'): CardBusiness {
  const hours = hoursState(extras.openingHours, now, t, localeTag);
  const coords = business.coordinateStatus === 'verified' && business.latitude !== undefined && business.longitude !== undefined
    ? {latitude: business.latitude, longitude: business.longitude}
    : undefined;
  return {
    id: business.id,
    name: business.name,
    category: t(categoryName(business.categories[0] ?? '')),
    tags: business.services,
    brands: business.brands,
    district: business.district,
    city: business.city,
    distanceKm: business.distance ?? null,
    rating: extras.reviewSummary?.average ?? 0,
    reviewCount: extras.reviewSummary?.count ?? 0,
    open: hours.open,
    hoursText: hours.known ? hours.text : business.hours ?? hours.text,
    hoursKnown: hours.known || !!business.hours,
    openStateKnown: hours.known,
    verified: business.ownership === 'verified',
    claimed: business.ownership !== 'unclaimed',
    sponsored: false,
    photo: business.image ?? null,
    phone: business.phone ?? '',
    address: business.address,
    map: {x: 50, y: 50},
    coords,
    source: business,
    extras,
  };
}

/**
 * A card in the page language, for display only (filters and matching keep the Turkish record).
 * Live cards rebuild their category and hours text from the API record; demo cards translate the
 * Turkish labels the mock data carries (category, hours, chips, "Tüm markalar"). Business names stay.
 */
export function localiseCard<T extends CardBusiness>(card: T, t: Translate = turkish, localeTag = 'tr-TR', now = new Date()): T {
  if (card.source) {
    const hours = hoursState(card.extras?.openingHours, now, t, localeTag);
    return {...card, category: t(categoryName(card.source.categories[0] ?? '')), hoursText: hours.known ? hours.text : card.source.hours ?? hours.text};
  }
  return {...card, category: t(card.category), hoursText: t(card.hoursText), tags: card.tags.map((tag) => t(tag)), brands: card.brands.map((brand) => t(brand))};
}

/** Places cards with coordinates on a 0–100 box for the drawn map (pins without coordinates are left out). */
export function placeOnMap<T extends CardBusiness>(items: T[]): T[] {
  const located = items.filter((item) => item.coords);
  if (!located.length) return items;
  const lats = located.map((i) => i.coords!.latitude);
  const lngs = located.map((i) => i.coords!.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const span = (a: number, b: number) => (b - a || 1);
  return items.map((item) => (item.coords
    ? {...item, map: {x: 10 + ((item.coords.longitude - minLng) / span(minLng, maxLng)) * 80, y: 10 + (1 - (item.coords.latitude - minLat) / span(minLat, maxLat)) * 80}}
    : item));
}
