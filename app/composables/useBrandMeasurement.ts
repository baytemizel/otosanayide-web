import type {ShallowRef} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {apiFetch} from '~/lib/api';
import {brandAppCheckToken} from '~/lib/brand-app-check';

async function transmit(token: string, kind: 'view' | 'click', expiresAtMs: number) {
  try {
    const appToken = await brandAppCheckToken();
    if (Date.now() >= expiresAtMs) return;
    await apiFetch('/api/brand-events', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Firebase-AppCheck': appToken}, body: JSON.stringify({token, kind}), keepalive: true, cache: 'no-store', redirect: 'error'});
  } catch {}
}

export function useBrandMeasurement(element: Readonly<ShallowRef<HTMLElement | null>>, ready: () => boolean, metrics: () => {token: string; expiresAtMs: number} | undefined) {
  const sent = new Set<string>();
  function emit(kind: 'view' | 'click') {
    const current = metrics();
    if (!ready() || !current || Date.now() >= current.expiresAtMs || sent.has(current.token + kind)) return;
    sent.add(current.token + kind);
    void transmit(current.token, kind, current.expiresAtMs);
  }
  useClientEffect(() => [ready(), metrics()?.token, metrics()?.expiresAtMs, element], () => {
    const target = element.value;
    if (!ready() || !metrics() || !target || !('IntersectionObserver' in window)) return;
    let visible = false, timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    const update = () => {
      cancel();
      if (visible && document.visibilityState === 'visible') timer = setTimeout(() => {
        if (visible && document.visibilityState === 'visible') emit('view');
      }, 1000);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5);
      update();
    }, {threshold: [0, 0.5, 1]});
    observer.observe(target);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  });
  return emit;
}
