import {computed} from 'vue';
import {useApp} from '~/composables/useApp';
import {callApi} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {readUnreadCount} from '~/lib/v2/account';

/** A navbar check at most this often per account; /bildirimler updates the count from its own pages. */
const REFRESH_MS = 30_000;
let lastAsked: {uid: string; at: number} | null = null;
let inflight: Promise<void> | null = null;

/**
 * Unread notifications of the signed-in member (live): `unreadCount` of GET /api/notifications?v=2 (v2-04),
 * the whole inbox regardless of filters. Null until known, and always null in demo mode (the demo bell keeps
 * the design's dot).
 */
export function useUnreadCount() {
  const app = useApp();
  const stored = useState<{uid: string; value: number} | null>('v2-unread-count', () => null);
  const value = computed(() => (!demoMode() && stored.value && stored.value.uid === app.user?.uid ? stored.value.value : null));

  function set(count: number | null) {
    const uid = app.user?.uid;
    if (!uid || count === null) return;
    stored.value = {uid, value: Math.max(0, count)};
    lastAsked = {uid, at: Date.now()};
  }
  function adjust(delta: number) {
    if (value.value !== null) set(value.value + delta);
  }

  async function refresh(force = false) {
    const user = app.user;
    if (demoMode() || !user) return;
    if (!force && lastAsked?.uid === user.uid && Date.now() - lastAsked.at < REFRESH_MS) return;
    if (inflight) return inflight;
    lastAsked = {uid: user.uid, at: Date.now()};
    inflight = (async () => {
      try {
        const count = await callApi('/api/notifications?v=2', {token: await user.getIdToken()}, readUnreadCount);
        if (count !== null && app.user?.uid === user.uid) stored.value = {uid: user.uid, value: count};
      } catch {
        /* The badge stays as it was; the list page shows its own error. */
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  return {value, set, adjust, refresh};
}
