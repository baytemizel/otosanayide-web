import {z} from 'zod';
import {apiFetch} from './api';

/**
 * The member's own reviews (web-17, `GET /api/reviews/mine/all`). With `v=2` (v2-03) each review also carries
 * communication / priceTransparency when scored, service and visitMonth (null when not given).
 */
const score = z.number().int().min(1).max(5);
const review = z.object({
  id: z.string().min(1).max(128), text: z.string().max(5000), rating: z.number().int().min(1).max(5).nullable(), version: z.number().int().nonnegative(),
  status: z.string().max(40), reason: z.string().max(1000), resolved: z.string().max(40), wc: z.string().max(40),
  canEdit: z.boolean(), canWithdraw: z.boolean(),
  quality: score.optional(), payment: score.optional(), cleanliness: score.optional(), wcCleanliness: score.optional(),
  communication: score.optional(), priceTransparency: score.optional(),
  service: z.string().max(120).nullable().optional(), visitMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional(),
}).passthrough();
const item = z.object({businessId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/), businessName: z.string().max(160), updatedAtMs: z.number().int().nonnegative().optional(), businessAvailable: z.boolean().optional(), review}).passthrough();
const page = z.object({items: z.array(item).max(50), next: z.string().min(1).max(512).nullable()}).passthrough();
export type OwnReviewListItem = z.infer<typeof item>;

/** `v2` asks for the v2-03 fields; an API without them answers 400 and the list is read again in the v1 shape. */
export async function fetchOwnReviews(token: () => Promise<string>, after = '', request: typeof apiFetch = apiFetch, v2 = true): Promise<z.infer<typeof page>> {
  const query = new URLSearchParams(v2 ? {v: '2'} : {});
  if (after) query.set('after', after);
  const response = await request('/api/reviews/mine/all' + (query.size ? '?' + query : ''), {headers: {Accept: 'application/json', Authorization: 'Bearer ' + (await token())}, cache: 'no-store'});
  if (v2 && response.status === 400) return fetchOwnReviews(token, after, request, false);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* below */
  }
  if (!response.ok) {
    const message = typeof (body as {error?: unknown})?.error === 'string' ? (body as {error: string}).error : '';
    throw new Error(response.status === 404 ? 'Bu işlem henüz kullanılamıyor.' : message || 'Yorumlar yüklenemedi.');
  }
  const parsed = page.safeParse(body);
  if (!parsed.success) throw new Error('Sunucu yanıtı beklenen biçimde değil. Sayfayı yenile; sürerse yöneticiye bildir.');
  return parsed.data;
}
