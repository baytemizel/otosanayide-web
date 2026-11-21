import {z} from 'zod';
import {categories, featureAvailable, reviewSchema, type Business} from '@otosanayide/core';
import {contactOptions} from '@otosanayide/core/contact';
import {locationSchema, mapsDirectionsUrl, mapsLocationUrl} from '@otosanayide/core/location';
import {reviewAspectKeys, type PublicReviewItem, type ReviewAspects} from '@otosanayide/core/public-reviews-client';
import {authorReviewAction} from '@otosanayide/core/review-author-actions';
import type {OwnReviewView} from '@otosanayide/core/review-author-client';
import {caseInput, reportReasons as reviewReportReasonValues, type ReviewReportReason} from '@otosanayide/core/review-cases';
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

/**
 * A review card. Live reviews (`GET /api/reviews?v=2`) carry the author's short name when the account has
 * one (otherwise `author` is '' and the card shows the anonymous label), their own chips and the publish date.
 */
export type ProfileReviewView = ProfileReview & {
  /** Dimension scores and WC answer, shown as small chips ("Hizmet kalitesi 5/5"). */
  chips?: string[];
  photos?: ProfilePhotoView[];
  /** When the review was published (live only). */
  published?: {iso: string; label: string} | null;
};

/** A rating bar. Live: an aspect average from `reviewSummary.aspects`; null = nobody scored it yet ("—"). */
export type ProfileDimension = {label: string; score: number | null; count?: number};

export type ProfileView = Omit<ProfileData, 'photos' | 'reviews' | 'dimensions'> & {
  photos: ProfilePhotoView[];
  reviews: ProfileReviewView[];
  dimensions: ProfileDimension[];
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
    dimensions: aspectDimensions(extras.reviewSummary?.aspects),
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
/** Score fields of reviewSchema in the order of the W04/W07 design (v2-03 added İletişim and Fiyat şeffaflığı). */
export const reviewScoreLabels = {
  quality: 'Hizmet kalitesi', communication: 'İletişim', priceTransparency: 'Fiyat şeffaflığı', payment: 'Ödeme kolaylığı', cleanliness: 'Temizlik', wcCleanliness: 'WC temizliği',
} as const;
export type ReviewScoreKey = keyof typeof reviewScoreLabels;

/**
 * Rating bars from `GET /api/businesses/{id}?v=2` → `reviewSummary.aspects` (published reviews only). Nothing is drawn
 * when the API sent no aspects or nobody has scored any aspect; a single unscored aspect shows "—".
 */
export function aspectDimensions(aspects: ReviewAspects | undefined): ProfileDimension[] {
  if (!aspects || !reviewAspectKeys.some((key) => (aspects[key]?.count ?? 0) > 0)) return [];
  return reviewAspectKeys.map((key) => ({label: reviewScoreLabels[key], score: aspects[key]?.average ?? null, count: aspects[key]?.count ?? 0}));
}

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/** "2026-10" → "Ekim 2026". */
export function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number);
  return year && m && m >= 1 && m <= 12 ? `${monthNames[m - 1]} ${year}` : month;
}
/** The current calendar month in Europe/Istanbul as [year, month]. */
function istanbulMonth(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit'}).formatToParts(now);
  return [Number(parts.find((p) => p.type === 'year')?.value), Number(parts.find((p) => p.type === 'month')?.value)] as const;
}
/** v2-03 rule: a visit month is this month or up to 24 months back (Europe/Istanbul calendar). */
export function visitMonthAllowed(month: string, now = new Date()) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return false;
  const [year, current] = istanbulMonth(now);
  const diff = year * 12 + current - (Number(match[1]) * 12 + Number(match[2]));
  return diff >= 0 && diff <= 24;
}
/** "Ziyaret ayı" choices: this month first, back to 24 months ago. */
export function visitMonthOptions(now = new Date()) {
  const [year, current] = istanbulMonth(now);
  return Array.from({length: 25}, (_, i) => {
    const index = year * 12 + current - 1 - i;
    const value = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
    return {value, label: monthLabel(value)};
  });
}

const avatarColors = ['var(--sky-200)', 'var(--orange-100)', 'var(--lime-100)', 'var(--cream-100)'];
/** Avatar letters as the API builds them: first + last word initials, or the first two letters of a single word. */
export function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const letters = parts.length === 1 ? [...parts[0]!].slice(0, 2).join('') : [...parts[0]!][0]! + [...parts.at(-1)!][0]!;
  return letters.toLocaleUpperCase('tr-TR');
}
const publishedFormat = new Intl.DateTimeFormat('tr-TR', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul'});

/**
 * A public review as a profile card. `media` builds the review photo URL (thumbnail or full size). The v2 fields
 * become what the demo card shows: the short author name with avatar letters and the "Ekim 2026 · Hizmet" line.
 */
export function reviewView(item: PublicReviewItem, media: (id: string, thumbnail: boolean) => string): ProfileReviewView {
  const chips = (Object.keys(reviewScoreLabels) as ReviewScoreKey[])
    .filter((key) => item[key] !== undefined)
    .map((key) => `${reviewScoreLabels[key]} ${item[key]}/5`);
  if (item.wc !== 'unknown') chips.push(`WC: ${wcLabel[item.wc]}`);
  const photos = (item.photoIds ?? []).map((id, i) => ({src: media(id, false), thumb: media(id, true), alt: `Yorum fotoğrafı ${i + 1}`}));
  const author = item.author?.displayName.trim() ?? '';
  return {
    id: item.id,
    author,
    initials: author ? nameInitials(author) : '',
    avatarColor: author ? avatarColors[[...author].reduce((sum, c) => sum + c.codePointAt(0)!, 0) % avatarColors.length]! : 'var(--cream-100)',
    meta: [item.visitMonth ? monthLabel(item.visitMonth) : '', item.service?.trim() ?? ''].filter(Boolean).join(' · '),
    published: item.publishedAtMs ? {iso: new Date(item.publishedAtMs).toISOString(), label: publishedFormat.format(item.publishedAtMs)} : null,
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

/** W07 answers as the modal keeps them. `service` / `visitMonth` ('' = not given) are v2-03 fields. */
export type ReviewAnswers = {
  rating: number;
  scores: Partial<Record<ReviewScoreKey, number>>;
  resolved: '' | ProfileReview['resolved'];
  wc: 'yes' | 'no' | 'unknown';
  text: string;
  service?: string;
  visitMonth?: string;
};

const resolvedValue: Record<ProfileReview['resolved'], PublicReviewItem['resolved']> = {Evet: 'yes', Kısmen: 'partial', Hayır: 'no', 'Henüz belli değil': 'unknown'};

/**
 * `POST /api/reviews` body (core reviewSchema). Unset scores, service and visit month are left out; WC cleanliness
 * only with WC "yes". A visit month outside this month … 24 months back is refused here as the API would (400).
 */
export function reviewBody(businessId: string, answers: ReviewAnswers, now = new Date()) {
  const service = answers.service?.trim() ?? '';
  const visitMonth = answers.visitMonth ?? '';
  if (visitMonth && !visitMonthAllowed(visitMonth, now)) throw Error('Ziyaret ayı gelecekte veya 24 aydan eski olamaz.');
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
    ...(service ? {service} : {}),
    ...(visitMonth ? {visitMonth} : {}),
  });
}

/**
 * `PATCH /api/reviews/mine` edit body. The API rewrites the whole review, so every answer is sent again;
 * a field left empty is cleared.
 */
export function reviewEditBody(businessId: string, expectedVersion: number, answers: ReviewAnswers, now = new Date()) {
  return authorReviewAction.parse({action: 'edit', businessId, expectedVersion, review: reviewBody(businessId, answers, now)});
}

const resolvedFromValue = Object.fromEntries(Object.entries(resolvedValue).map(([label, value]) => [value, label])) as Record<PublicReviewItem['resolved'], ProfileReview['resolved']>;

/**
 * The member's own review (`GET /api/reviews/mine?v=2`) as form answers for editing. A visit month that is now
 * older than 24 months cannot be sent again; it is dropped and `droppedMonth` tells the form to say so.
 */
export function answersFromOwn(own: OwnReviewView, now = new Date()): {answers: ReviewAnswers; droppedMonth: boolean} {
  const scores = Object.fromEntries((Object.keys(reviewScoreLabels) as ReviewScoreKey[]).filter((key) => own[key] !== undefined).map((key) => [key, own[key]]));
  const month = own.visitMonth ?? '';
  const keepMonth = !!month && visitMonthAllowed(month, now);
  return {
    answers: {
      rating: own.rating ?? 0,
      scores,
      resolved: own.resolved === 'unknown' ? '' : resolvedFromValue[own.resolved],
      wc: own.wc,
      text: own.text,
      service: own.service ?? '',
      visitMonth: keepMonth ? month : '',
    },
    droppedMonth: !!month && !keepMonth,
  };
}

/** Text limits of reviewSchema (the mock modal used 20 / 2000). */
export const reviewTextLimits = {min: 10, max: 3000} as const;

/** `POST /api/reviews` answer. */
export const reviewCreated = z.object({id: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/), status: z.literal('pending')}).strict();

/** /yorumlarim meta line from the v2-03 fields of an own review: "Ziyaret: Ekim 2026 · Periyodik bakım" ('' when neither is given). */
export function ownReviewMeta(review: {visitMonth?: string | null; service?: string | null}) {
  return [review.visitMonth ? `Ziyaret: ${monthLabel(review.visitMonth)}` : '', review.service?.trim() ?? ''].filter(Boolean).join(' · ');
}

/** Review report reasons (v2-03, `POST /api/review-cases`). Only "Diğer" needs a written explanation. */
export const reviewReportReasonLabels: Record<ReviewReportReason, string> = {
  fake: 'Sahte veya yanıltıcı yorum',
  offensive: 'Hakaret veya saldırgan içerik',
  personal_data: 'Kişisel bilgi paylaşılmış',
  not_customer: 'Yorumcu bu işletmenin müşterisi değil',
  spam: 'Spam veya reklam',
  other: 'Diğer',
};
export const reviewReportReasons = reviewReportReasonValues.map((value) => ({value, label: reviewReportReasonLabels[value]}));
export type {ReviewReportReason};

/** `POST /api/review-cases` report body: the reason, plus the text when one was written (needed for "Diğer"). */
export function reviewReportBody(reviewId: string, reason: ReviewReportReason, text = '') {
  const trimmed = text.trim();
  return caseInput.parse({reviewId, kind: 'report', reason, ...(trimmed ? {text: trimmed} : {})});
}

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
