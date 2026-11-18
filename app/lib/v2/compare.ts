import {categories, type Business} from '@otosanayide/core';
import type {SearchBusiness} from '~/data/mock/search';
import {hoursState} from '~/lib/v2/business-card';
import type {BusinessExtras} from '~/lib/search-response';

/**
 * One column of the W06 comparison table. Demo columns come from the mock search facts, live ones
 * from `GET /api/businesses/{id}?v=2`. `null` means the source has no data for that row ("Bilgi yok");
 * a declared list that does not mention a service or brand is "Bilinmiyor", never "Hayır".
 */
export interface CompareColumn {
  id: string;
  name: string;
  photo: string | null;
  /** null: no review data from the source. */
  reviews: {count: number; average: number} | null;
  distanceKm: number | null;
  ownership: 'verified' | 'claimed' | 'unclaimed';
  category: string;
  services: string[];
  brands: string[];
  /** Card payment: true / false as declared, null when unknown. Demo only knows "yes" or unknown. */
  card: boolean | null;
  /** `open` is null for free-text hours (no open/closed state can be read from them). */
  hours: {known: boolean; open: boolean | null; text: string};
  quote: boolean;
  appointment: boolean;
  phone: string;
}

export function compareFromMock(b: SearchBusiness): CompareColumn {
  return {
    id: b.id,
    name: b.name,
    photo: b.photo,
    reviews: {count: b.reviewCount, average: b.rating},
    distanceKm: b.distanceKm,
    ownership: b.verified ? 'verified' : b.claimed ? 'claimed' : 'unclaimed',
    category: b.category,
    services: b.services,
    brands: b.brands,
    card: b.payments.includes('kart') ? true : null,
    hours: {known: b.hoursKnown, open: b.open, text: b.hoursKnown ? b.hoursText : 'Saat bilgisi yok'},
    quote: b.quote,
    appointment: b.appointment,
    phone: b.phone,
  };
}

const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

/** A live column. `distanceKm` comes from the search that selected it (the profile endpoint has none). */
export function compareFromLive(business: Business, extras: BusinessExtras, distanceKm: number | null = null, now = new Date()): CompareColumn {
  const hours = hoursState(extras.openingHours, now);
  return {
    id: business.id,
    name: business.name,
    photo: business.image ?? null,
    reviews: extras.reviewSummary ? {count: extras.reviewSummary.count, average: extras.reviewSummary.average ?? 0} : null,
    distanceKm: business.distance ?? distanceKm,
    ownership: business.ownership === 'verified' ? 'verified' : business.ownership === 'pending' ? 'claimed' : 'unclaimed',
    category: categoryName(business.categories[0] ?? ''),
    services: [...business.services, ...business.categories.map(categoryName)],
    brands: business.brands,
    card: business.cardPayment ?? null,
    hours: hours.known ? hours : business.hours ? {known: true, open: null, text: business.hours} : hours,
    quote: business.features.quotes,
    appointment: business.features.appointments,
    phone: business.phone ?? '',
  };
}

/** Default name of a saved comparison: the business names, cut to the API's 60 characters. */
export function comparisonName(columns: Pick<CompareColumn, 'name'>[]) {
  const short = columns.map((c) => c.name.replace(/^Örnek\s+/, '')).join(' · ');
  const name = `Karşılaştırma: ${short}`;
  return name.length > 60 ? `${name.slice(0, 59).trimEnd()}…` : name;
}
