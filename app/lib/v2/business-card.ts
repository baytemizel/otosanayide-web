import {categories, type Business} from '@otosanayide/core';
import type {MockBusiness} from '~/data/mock/businesses';
import {openState, type OpeningHours} from '~/lib/opening-hours';
import type {BusinessExtras} from '~/lib/search-response';

/**
 * View model of a service card / profile head (V2/Kart/Servis). Demo data (app/data/mock) already has
 * this shape; live data comes from `toCardBusiness`. `source` keeps the API record for screens that need more.
 */
export type CardBusiness = MockBusiness & {
  hoursKnown?: boolean;
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

/** "Açık · 19.00’a kadar" / "Kapalı · 08.30’da açılır" style text from structured hours. */
export function hoursState(hours: OpeningHours | undefined, now = new Date()): {known: boolean; open: boolean; text: string} {
  if (!hours) return {known: false, open: false, text: 'Saat bilgisi yok'};
  const state = openState(hours, now);
  if (state.open) return {known: true, open: true, text: `Açık · ${dativeTime(state.until === '24:00' ? '00:00' : state.until)} kadar`};
  return {known: true, open: false, text: state.opensAt ? `Kapalı · ${state.opensAt.replace(':', '.')} açılır` : 'Bugün kapalı'};
}

export function toCardBusiness(business: Business, extras: BusinessExtras = {}, now = new Date()): CardBusiness {
  const hours = hoursState(extras.openingHours, now);
  const coords = business.coordinateStatus === 'verified' && business.latitude !== undefined && business.longitude !== undefined
    ? {latitude: business.latitude, longitude: business.longitude}
    : undefined;
  return {
    id: business.id,
    name: business.name,
    category: categoryName(business.categories[0] ?? ''),
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
