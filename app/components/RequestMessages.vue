<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {errorStatus} from '~/lib/api-read';
import {messagesApi, type RequestMessage} from '~/lib/member-api';

/** web-15 (2): the request thread between the member and the business. No notification is sent. */
const props = defineProps<{requestId: string; open: boolean}>();
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const items = ref<RequestMessage[]>([]);
const next = ref<string | null>(null);
const text = ref('');
const busy = ref(false);
const error = ref('');
let operationId = '';

async function load(after = '') {
  const user = app.user;
  if (!user) return;
  try {
    const page = await messagesApi.read(() => user.getIdToken(), props.requestId, after);
    items.value = after ? [...items.value, ...page.items] : page.items;
    next.value = page.next;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Mesajlar yüklenemedi.';
  }
}
useClientEffect(() => [app.user, props.requestId], () => {
  items.value = [];
  void load();
});

async function send(e: Event) {
  e.preventDefault();
  const user = app.user, value = text.value.trim();
  if (!user || !value || busy.value) return;
  busy.value = true;
  error.value = '';
  operationId ||= crypto.randomUUID();
  try {
    const sent = await messagesApi.send(() => user.getIdToken(), props.requestId, value, operationId);
    operationId = '';
    text.value = '';
    if (!items.value.some(m => m.id === sent.id)) items.value = [...items.value, sent];
  } catch (err) {
    const status = errorStatus(err);
    error.value = status === 409 ? 'Bu talep kapandığı için mesaj gönderilemez.' : err instanceof Error ? err.message : 'Mesaj gönderilemedi.';
  } finally {
    busy.value = false;
  }
}
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short'});
</script>

<template>
  <div class="ds-col ds-g8 thread">
    <div v-for="m in items" :key="m.id" class="bubble" :class="m.author">
      <p class="review-text ds-small">{{ m.text }}</p>
      <span class="ds-xs ds-muted">{{ i18nT(m.author === 'business' ? 'İşletme' : 'Sen') }} · {{ time(m.createdAtMs) }}</span>
    </div>
    <button v-if="next" type="button" class="ds-btn g sm" @click="load(next!)">{{ i18nT('Daha fazla mesaj') }}</button>
    <form v-if="open" class="send" @submit="send">
      <input v-model="text" class="ds-field" maxlength="1000" :disabled="busy" :aria-label="i18nT('Mesaj yaz…')" :placeholder="i18nT('Mesaj yaz…')"/>
      <button class="ds-iconbtn" :disabled="busy || !text.trim()" :aria-label="i18nT('Gönder')"><ArrowRight :size="18"/></button>
    </form>
    <p v-else class="ds-xs ds-muted">{{ i18nT('Kapanmış talepte mesaj gönderilemez.') }}</p>
    <p class="ds-xs ds-muted">{{ i18nT('İletişim bilgisi veya bağlantı paylaşma. Mesajlar bildirim olarak gönderilmez.') }}</p>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </div>
</template>

<style scoped>
.thread p {margin: 0;}
.bubble {max-width: 85%; padding: 10px 12px; border-radius: 12px; background: #f4f6f8;}
.bubble.customer {align-self: flex-end; background: #fff3ec;}
.send {display: flex; gap: 8px; align-items: center;}
.send .ds-field {flex: 1; min-width: 0;}
</style>
