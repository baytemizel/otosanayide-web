import {onMounted, ref} from 'vue';

/**
 * Emailed links carry a one-use ?token=. It is read once on the client and immediately
 * removed from the address bar and history, so it cannot be copied, bookmarked or sent on.
 */
export function useLinkToken(onToken?: (token: string) => void) {
  const token = ref('');
  const missing = ref(false);
  useHead({meta: [{name: 'referrer', content: 'no-referrer'}]});
  onMounted(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get('token') ?? '';
    url.searchParams.delete('token');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (!value) {
      missing.value = true;
      return;
    }
    token.value = value;
    onToken?.(value);
  });
  return {token, missing};
}
