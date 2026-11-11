import {z} from 'zod';
import {apiFetch} from './api';

/** Proposed list of the member's own reviews (endpoint request web-17). */
const review = z.object({
  id: z.string().min(1).max(128), text: z.string().max(5000), rating: z.number().int().min(1).max(5).nullable(), version: z.number().int().nonnegative(),
  status: z.string().max(40), reason: z.string().max(1000), resolved: z.string().max(40), wc: z.string().max(40),
  canEdit: z.boolean(), canWithdraw: z.boolean(),
}).passthrough();
const item = z.object({businessId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/), businessName: z.string().max(160), updatedAtMs: z.number().int().nonnegative().optional(), businessAvailable: z.boolean().optional(), review}).passthrough();
const page = z.object({items: z.array(item).max(50), next: z.string().min(1).max(512).nullable()}).passthrough();
export type OwnReviewListItem = z.infer<typeof item>;

export async function fetchOwnReviews(token: () => Promise<string>, after = '', request: typeof apiFetch = apiFetch) {
  const response = await request('/api/reviews/mine/all' + (after ? '?after=' + encodeURIComponent(after) : ''), {headers: {Accept: 'application/json', Authorization: 'Bearer ' + (await token())}, cache: 'no-store'});
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
