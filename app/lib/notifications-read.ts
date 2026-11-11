import {z} from 'zod';
import {apiFetch} from './api';

const answer = z.object({updated: z.number().int().nonnegative(), more: z.boolean()}).passthrough();
const MAX_ROUNDS = 20;

/**
 * web-11: marks every notification created before `before` as read. The API caps one call
 * at 1000 rows and says `more`; the same `before` is repeated so new arrivals stay unread.
 */
export async function readAllNotifications(token: () => Promise<string>, before: number, request: typeof apiFetch = apiFetch) {
  let total = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await request('/api/notifications/read-all', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + (await token())},
      body: JSON.stringify({before: Math.floor(before)}),
      cache: 'no-store',
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* handled below */
    }
    if (!response.ok) {
      const message = typeof (body as {error?: unknown})?.error === 'string' ? (body as {error: string}).error : '';
      throw new Error(response.status === 404 ? 'Bu işlem henüz kullanılamıyor.' : message || 'İşlem tamamlanamadı. Tekrar dene.');
    }
    const parsed = answer.parse(body);
    total += parsed.updated;
    if (!parsed.more) return total;
  }
  return total;
}
