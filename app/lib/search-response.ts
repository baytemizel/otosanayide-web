import {z} from 'zod';
import type {Business} from '@otosanayide/core';
import {businessContactEmail, contactPhone} from '@otosanayide/core/contact';
import {reviewAspects, type ReviewAspects} from '@otosanayide/core/public-reviews-client';
import {decodeSearchResult} from '@otosanayide/core/search-client';
import type {SponsoredItem} from '@otosanayide/core/sponsored';
import {openingHoursSchema, type OpeningHours} from './opening-hours';

/**
 * The core business schema is strict, so fields the API may add later (endpoint requests
 * web-05…web-08) are taken off here, parsed on their own and dropped if malformed. The
 * remainder goes through the unchanged core parser. A single bad item is left out
 * instead of failing the whole page.
 */
export type ReviewSummary = {count: number; average: number | null; aspects?: ReviewAspects};
export type BusinessExtras = {openingHours?: OpeningHours; reviewSummary?: ReviewSummary};
export type Facets = Partial<Record<'categories' | 'services' | 'brands' | 'flags', Record<string, number>>>;
export type SearchPage = {
  items: Business[];
  districts: string[];
  sponsored: SponsoredItem[];
  extras: Record<string, BusinessExtras>;
  nextCursor: string | null;
  total: {value: number; exact: boolean} | null;
  facets: Facets | null;
  dropped: number;
};

const businessExtensionKeys = ['openingHours', 'reviewSummary', 'cash', 'installments', 'waitingArea', 'accessible', 'industrialSite'] as const;
// `aspects` (v2-03) comes only from the single-business endpoint.
const reviewSummarySchema = z.object({count: z.number().int().nonnegative(), average: z.number().min(1).max(5).nullable(), aspects: reviewAspects.optional()}).strict()
  .refine(v => (v.count === 0) === (v.average === null));
const count = z.number().int().nonnegative();
const facetsSchema = z.object({
  categories: z.record(z.string().max(80), count).optional(),
  services: z.record(z.string().max(120), count).optional(),
  brands: z.record(z.string().max(80), count).optional(),
  flags: z.record(z.string().max(40), count).optional(),
}).partial();
const cursorSchema = z.string().min(1).max(512).regex(/^[A-Za-z0-9._~-]+$/);
const totalSchema = z.object({value: count, exact: z.boolean()}).strict();

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Optional contact fields with the core parser's own rules. Imported records carry values such as
 * "http://www.7/24otoankara.com" that the core rejects, and one bad link would then hide the whole
 * business (an unavailable profile, a card missing from search). Such a value is left out instead;
 * the core parser still checks everything that remains.
 */
const contactChecks: Record<'website' | 'phone' | 'contactEmail', {max: number; valid: (value: string) => boolean}> = {
  website: {max: 500, valid: (value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }},
  phone: {max: 80, valid: (value) => !!contactPhone(value)},
  contactEmail: {max: 254, valid: (value) => !!businessContactEmail(value)},
};

function dropInvalidContacts(core: Record<string, unknown>) {
  for (const [key, check] of Object.entries(contactChecks)) {
    const value = core[key];
    if (value === undefined) continue;
    const text = typeof value === 'string' ? value.trim() : null;
    if (text === null || text.length > check.max || (text !== '' && !check.valid(text))) delete core[key];
  }
}

/** Splits a raw business into the core shape and the parsed extensions. */
export function splitBusiness(raw: unknown): {core: unknown; extras: BusinessExtras} {
  if (!isRecord(raw)) return {core: raw, extras: {}};
  const core: Record<string, unknown> = {...raw};
  for (const key of businessExtensionKeys) delete core[key];
  dropInvalidContacts(core);
  const extras: BusinessExtras = {};
  const hours = openingHoursSchema.safeParse(raw.openingHours);
  if (hours.success) extras.openingHours = hours.data;
  const summary = reviewSummarySchema.safeParse(raw.reviewSummary);
  if (summary.success) extras.reviewSummary = summary.data;
  return {core, extras};
}

export function decodeBusiness(raw: unknown, mode: 'demo' | 'live'): {business: Business; extras: BusinessExtras} {
  const {core, extras} = splitBusiness(raw);
  const business = decodeSearchResult({items: [core], districts: [], mode}, mode).items[0];
  if (!business) throw Error('search_response');
  return {business, extras};
}

export function decodeSearchPage(raw: unknown, mode: 'demo' | 'live'): SearchPage {
  if (!isRecord(raw) || !Array.isArray(raw.items)) throw Error('search_response');
  const items: Business[] = [];
  const extras: Record<string, BusinessExtras> = {};
  let dropped = 0;
  for (const entry of raw.items) {
    try {
      const decoded = decodeBusiness(entry, mode);
      if (items.some(b => b.id === decoded.business.id)) throw Error('duplicate');
      items.push(decoded.business);
      extras[decoded.business.id] = decoded.extras;
    } catch {
      dropped++;
    }
  }
  // Districts and sponsored entries keep the core rules (sponsored is all-or-nothing, as before).
  const rawSponsored = Array.isArray(raw.sponsored) ? raw.sponsored : undefined;
  const sponsoredCore = rawSponsored?.map(s => (isRecord(s) ? {...s, business: splitBusiness(s.business).core} : s));
  const checked = decodeSearchResult({items: [], districts: raw.districts, mode: raw.mode, ...(sponsoredCore ? {sponsored: sponsoredCore} : {})}, mode);
  const sponsored = (sponsoredCore ?? []) as SponsoredItem[];
  const nextCursor = cursorSchema.safeParse(raw.nextCursor);
  const total = totalSchema.safeParse(raw.total);
  const facets = facetsSchema.safeParse(raw.facets);
  return {
    items,
    districts: checked.districts,
    sponsored,
    extras,
    nextCursor: nextCursor.success ? nextCursor.data : null,
    total: total.success ? total.data : null,
    facets: raw.facets !== undefined && facets.success ? facets.data : null,
    dropped,
  };
}
