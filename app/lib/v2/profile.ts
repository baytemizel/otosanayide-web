import {z} from 'zod';
import {categories, featureAvailable, reviewSchema, type Business} from '@otosanayide/core';
import {contactOptions} from '@otosanayide/core/contact';
import {locationSchema, mapsDirectionsUrl, mapsLocationUrl} from '@otosanayide/core/location';
import type {PublicReviewItem} from '@otosanayide/core/public-reviews-client';
import type {ProfileData, ProfileHoursRow, ProfilePhoto, ProfileReview} from '~/data/mock/profile';
import {reportReasonLabels, reportReasons, type ReportReason} from '~/lib/business-report';
import {weekRows, type OpeningHours} from '~/lib/opening-hours';
import type {BusinessExtras, ReviewSummary} from '~/lib/search-response';

/**
 * Live view models for /servis/[id] (W04/W05/W07/S08). The profile components were drawn for the
 * mock `ProfileData`; these functions turn the API records (`GET /api/businesses/{id}?v=2`,
 * `GET /api/reviews`) into that shape plus the few fields only live data has. Demo mode keeps
 * using `app/data/mock/profile.ts` unchanged.
 */

/** A photo with an optional thumbnail (live media URLs have both sizes). */
export type ProfilePhotoView = ProfilePhoto & {thumb?: string};

/** A review card. Live reviews are anonymous (the API returns no author) and carry their own chips. */
export type ProfileReviewView = ProfileReview & {
  /** Dimension scores and WC answer, shown as small chips ("Hizmet kalitesi 5/5"). */
  chips?: string[];
  photos?: ProfilePhotoView[];
};

export type ProfileView = Omit<ProfileData, 'photos' | 'reviews'> & {
  photos: ProfilePhotoView[];
  reviews: ProfileReviewView[];
  /** Free-text hours from the record when there is no structured week (shown as written). */
  hoursNote?: string | null;
};

/** Review count and average; null means "not known yet", never zero. */
export type ReviewSummaryView = ReviewSummary | null;

const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const clock = (hhmm: string) => hhmm.replace(':', '.');

/** Monday-first week table; consecutive days with the same hours share a row ("Pazartesi – Cuma"). */
export function hoursRows(hours: OpeningHours): ProfileHoursRow[] {
  const rows: (ProfileHoursRow & {first: number; last: number})[] = [];
  for (const row of weekRows(hours)) {
    const time = row.intervals.length ? row.intervals.map((i) => `${clock(i.open)} – ${clock(i.close)}`).join(', ') : 'Kapalı';
    const jsDay = row.day % 7;
    const previous = rows.at(-1);
    if (previous && previous.time === time && previous.last === row.day - 1) {
      previous.last = row.day;
      previous.days.push(jsDay);
    } else {
      rows.push({label: '', days: [jsDay], time, first: row.day, last: row.day});
    }
  }
  return rows.map(({first, last, days, time}) => ({
    label: first === last ? dayNames[first - 1]! : `${dayNames[first - 1]} – ${dayNames[last - 1]}`,
    days,
    time,
  }));
}

const answer = (value: boolean | undefined) => (value === true ? 'Var' : value === false ? 'Yok' : null);

/** Facts in the action card: only what the record states; nothing is assumed. */
export function liveFacts(business: Business) {
  const facts: {label: string; value: string}[] = [];
  if (business.cardPayment !== undefined) facts.push({label: 'Kart ile ödeme', value: business.cardPayment ? 'Var' : 'Yok'});
  const wc = answer(business.wc);
  if (wc) facts.push({label: 'WC', value: wc});
  return facts;
}

/** Profile data from the API record; reviews and photos are loaded in the browser and added later. */
export function liveProfile(business: Business, extras: BusinessExtras = {}): ProfileView {
  const managed = business.ownership !== 'unclaimed';
  return {
    services: business.services,
    brands: business.brands.length ? business.brands : null,
    source: managed ? 'owner' : 'catalog',
    sourceNote: managed
      ? 'Marka uzmanlığı işletme beyanıdır; yetkili servis anlamına gelmez.'
      : 'Bilgiler katalog kaynağından alınmıştır; işletme tarafından doğrulanmadı.',
    hours: extras.openingHours ? hoursRows(extras.openingHours) : null,
    hoursNote: extras.openingHours ? null : business.hours?.trim() || null,
    coordinateVerified: business.coordinateStatus === 'verified',
    photos: [],
    photoCount: 0,
    // The API has no dimension averages; the bars are not drawn in live mode.
    dimensions: [],
    reviews: [],
    facts: liveFacts(business),
  };
}

/** Call, directions and map targets. A route only for a verified point, otherwise an address search. */
export function contactTargets(business: Business) {
  const phone = contactOptions(business.phone);
  const point = locationSchema.safeParse({latitude: business.latitude, longitude: business.longitude, address: business.address});
  const verified = business.coordinateStatus === 'verified' && point.success;
  const search = `https://www.google.com/maps/search/?${new URLSearchParams({api: '1', query: [business.name, business.address, business.district, business.city].join(' ')})}`;
  return {
    call: phone?.call ?? null,
    phone: phone?.displayNumber ?? null,
    verified,
    directions: verified && point.success ? mapsDirectionsUrl(point.data) : search,
    map: verified && point.success ? mapsLocationUrl(point.data) : search,
  };
}

/** "Teklif iste" / "Randevu al" are active only when the core activation rule allows them. */
export function requestActions(business: Business) {
  return {quotes: featureAvailable(business, 'quotes'), appointments: featureAvailable(business, 'appointments')};
}

const resolvedLabel: Record<PublicReviewItem['resolved'], ProfileReview['resolved']> = {yes: 'Evet', partial: 'Kısmen', no: 'Hayır', unknown: 'Henüz belli değil'};
const wcLabel: Record<PublicReviewItem['wc'], string> = {yes: 'Var', no: 'Yok', unknown: 'Bilinmiyor'};
export const reviewScoreLabels = {quality: 'Hizmet kalitesi', payment: 'Ödeme kolaylığı', cleanliness: 'Temizlik', wcCleanliness: 'WC temizliği'} as const;
export type ReviewScoreKey = keyof typeof reviewScoreLabels;

/** A public review as a profile card. `media` builds the review photo URL (thumbnail or full size). */
export function reviewView(item: PublicReviewItem, media: (id: string, thumbnail: boolean) => string): ProfileReviewView {
  const chips = (Object.keys(reviewScoreLabels) as ReviewScoreKey[])
    .filter((key) => item[key] !== undefined)
    .map((key) => `${reviewScoreLabels[key]} ${item[key]}/5`);
  if (item.wc !== 'unknown') chips.push(`WC: ${wcLabel[item.wc]}`);
  const photos = (item.photoIds ?? []).map((id, i) => ({src: media(id, false), thumb: media(id, true), alt: `Yorum fotoğrafı ${i + 1}`}));
  return {
    id: item.id,
    author: '',
    initials: '',
    avatarColor: 'var(--cream-100)',
    meta: '',
    rating: item.rating,
    text: item.text,
    resolved: resolvedLabel[item.resolved],
    photoCount: photos.length,
    ownerReply: item.reply?.text ?? null,
    helpful: 0,
    chips,
    photos,
  };
}

/** W07 answers as the modal keeps them; the API fields are a subset of what the mock draws. */
export type ReviewAnswers = {
  rating: number;
  scores: Partial<Record<ReviewScoreKey, number>>;
  resolved: '' | ProfileReview['resolved'];
  wc: 'yes' | 'no' | 'unknown';
  text: string;
};

const resolvedValue: Record<ProfileReview['resolved'], PublicReviewItem['resolved']> = {Evet: 'yes', Kısmen: 'partial', Hayır: 'no', 'Henüz belli değil': 'unknown'};

/** `POST /api/reviews` body (core reviewSchema). Unset scores are left out; WC cleanliness only with WC "yes". */
export function reviewBody(businessId: string, answers: ReviewAnswers) {
  const scores = Object.fromEntries(
    (Object.keys(reviewScoreLabels) as ReviewScoreKey[])
      .filter((key) => (key !== 'wcCleanliness' || answers.wc === 'yes') && (answers.scores[key] ?? 0) > 0)
      .map((key) => [key, answers.scores[key]]),
  );
  return reviewSchema.parse({
    businessId,
    rating: answers.rating,
    ...scores,
    resolved: answers.resolved ? resolvedValue[answers.resolved] : 'unknown',
    wc: answers.wc,
    text: answers.text,
  });
}

/** Text limits of reviewSchema (the mock modal used 20 / 2000). */
export const reviewTextLimits = {min: 10, max: 3000} as const;

/** `POST /api/reviews` answer. */
export const reviewCreated = z.object({id: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/), status: z.literal('pending')}).strict();

/** S08 reasons with their labels (web-04). */
export const liveReportReasons = reportReasons.map((value) => ({value, label: reportReasonLabels[value]}));
export type {ReportReason};

/** Title and description for the page head, built only from returned fields. */
export function profileSeo(business: Business) {
  const category = categories.find((c) => c.id === business.categories[0])?.name;
  const title = [business.name, [business.district, business.city].join(' / '), category ?? ''].filter(Boolean).join(' · ');
  const services = business.services.slice(0, 4).join(', ');
  const description = `${business.name}, ${business.district} / ${business.city}. Hizmetler: ${services || '—'}. Telefon, yol tarifi ve yorumlar Otosanayide’de.`;
  return {title, description};
}

/** Street line for the header: the record's address with the district appended when it is not already there. */
export function addressLine(address: string, district: string) {
  return address.trim().toLocaleLowerCase('tr-TR').endsWith(district.toLocaleLowerCase('tr-TR')) ? address : `${address}, ${district}`;
}
