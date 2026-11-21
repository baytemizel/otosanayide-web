import {z} from 'zod';

/**
 * v2-04 account pieces for the live screens: the member profile (`GET/PATCH /api/me/profile`), the
 * unread count of `GET /api/notifications?v=2`. (With ?v=2 notifications carry the v2 request statuses
 * expired/no_show; lib/v2/requests notificationView names them.)
 */

export type ProfileLocale = 'tr' | 'en';
export interface MemberProfile {displayName: string | null; locale: ProfileLocale | null}

const profileSchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  locale: z.string().max(10).nullable().optional(),
}).passthrough();

/** `GET/PATCH /api/me/profile` → name and language. An unknown locale reads as "not chosen". */
export function decodeProfile(raw: unknown): MemberProfile {
  const parsed = profileSchema.parse(raw);
  const name = parsed.displayName?.trim() || null;
  const locale = parsed.locale === 'tr' || parsed.locale === 'en' ? parsed.locale : null;
  return {displayName: name, locale};
}

export const localeOptions: {value: ProfileLocale; label: string}[] = [{value: 'tr', label: 'Türkçe'}, {value: 'en', label: 'English'}];

/** The PATCH body: only what changed; a cleared name is sent as null (the API then removes it). */
export function profileChanges(current: MemberProfile, next: {displayName: string; locale: ProfileLocale | null}) {
  const changes: {displayName?: string | null; locale?: ProfileLocale | null} = {};
  const name = next.displayName || null;
  if (name !== current.displayName) changes.displayName = name;
  if (next.locale !== current.locale) changes.locale = next.locale;
  return changes;
}

/** `unreadCount` of a v2 notifications page, or null when the API did not send it (v1 answer). */
export function readUnreadCount(raw: unknown): number | null {
  const value = (raw as {unreadCount?: unknown} | null)?.unreadCount;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Badge text: "3", "99+". */
export const unreadBadge = (count: number) => (count > 99 ? '99+' : String(count));

/** "12 Kasım 2026" / "12 November 2026": a moment as a long day in Türkiye time, in the page's language tag. */
export const longDay = (ms: number, tag = 'tr-TR') => new Date(ms).toLocaleDateString(tag, {timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric'});

/** An ISO day (YYYY-MM-DD, demo data) as a long day, read at noon Türkiye time so it never shifts a day. */
export const isoDay = (day: string, tag = 'tr-TR') => longDay(Date.parse(`${day}T12:00:00+03:00`), tag);
