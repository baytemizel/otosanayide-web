<script setup lang="ts">
import {useTemplateRef} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {apiFetch} from '~/lib/api';

function transmit(token: string, kind: 'view' | 'click') {
  void apiFetch('/api/ad-events', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, kind}), keepalive: true}).catch(() => {});
}

const props = defineProps<{token?: string; onEvent?: (token: string, kind: 'view' | 'click') => void}>();
const el = useTemplateRef<HTMLElement>('el');
const sent = new Set<string>();
const handler = () => props.onEvent ?? transmit;

function emit(kind: 'view' | 'click') {
  const token = props.token;
  if (!token || sent.has(token + kind)) return;
  sent.add(token + kind);
  handler()(token, kind);
}

useClientEffect(() => [props.token, handler()], () => {
  const token = props.token, onEvent = handler(), target = el.value;
  if (!token || !target || !('IntersectionObserver' in window)) return;
  let visible = false, timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  const update = () => {
    cancel();
    if (visible && document.visibilityState === 'visible' && !sent.has(token + 'view')) timer = setTimeout(() => {
      if (!sent.has(token + 'view')) {
        sent.add(token + 'view');
        onEvent(token, 'view');
      }
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

function onClick(e: MouseEvent) {
  if (e.isTrusted && (e.target as Element).closest('a')) emit('click');
}
function onAuxClick(e: MouseEvent) {
  if (e.isTrusted && e.button === 1 && (e.target as Element).closest('a')) emit('click');
}
</script>

<template>
  <article ref="el" class="business-card" @click="onClick" @auxclick="onAuxClick"><slot/></article>
</template>
