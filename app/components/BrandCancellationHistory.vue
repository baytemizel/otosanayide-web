<script setup lang="ts">
import {ref} from 'vue';
import type {z} from 'zod';
import BrandRefundReview from '~/components/BrandRefundReview.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {brandRefundLabels} from '@otosanayide/core/brand-cancellation';
import {cancellationHistoryResponse, cancellationHistoryLabels} from '@otosanayide/core/brand-cancellation-queue';

const props = defineProps<{id: string}>();
const app = useApp();
const {t, localeTag} = useLocale();
const data = ref<z.infer<typeof cancellationHistoryResponse> | null>(null);
const busy = ref(false);
const error = ref('');
let lock = false;

async function load(after?: string) {
  if (lock) return;
  const id = props.id;
  lock = true;
  busy.value = true;
  error.value = '';
  data.value = null;
  try {
    const r = await apiFetch('/api/admin/brand-cancellation-history?' + new URLSearchParams({reservationId: id, ...(after ? {after} : {})}), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), raw = await r.json();
    if (!r.ok) throw Error(raw.error);
    const d = cancellationHistoryResponse.parse(raw);
    if (d.reservationId !== id) throw Error('Kayıt değişti. Sayfayı yenile.');
    data.value = d;
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Geçmiş kaydı doğrulanamadı. Durumu yenile.';
  } finally {
    lock = false;
    busy.value = false;
  }
}

const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
const money = (minor: number, currency: string) => new Intl.NumberFormat(localeTag.value, {style: 'currency', currency}).format(minor / 100);
</script>

<template>
  <section class="sec ds-col ds-g12">
    <h4>{{ t('İptal ve İade Karar Geçmişi') }}</h4>
    <p>{{ t('En yeniden eskiye, sayfa başına 20 olay. Ek iade kayıtları da bu geçmişte yer alır.') }}</p>
    <div class="ds-row ds-g8 ds-wrap">
      <button :disabled="busy" class="ds-btn s" @click="void load()">{{ t('Geçmişi yenile') }}</button>
      <button v-if="data?.next" :disabled="busy" class="ds-btn s" @click="void load(data.next!)">{{ t('Daha eski olaylar') }}</button>
    </div>
    <article v-for="(event,i) in data?.items" :key="`${event.createdAtMs}-${i}`" class="ds-note ds-col">
      <strong>{{ t(cancellationHistoryLabels[event.action]) }}</strong>
      <small class="ds-xs ds-muted">{{ time(event.createdAtMs) }} · {{ t('İstanbul saati') }}</small>
      <p class="brk" v-if="event.note">{{ event.note }}</p>
      <strong v-if="event.outcome">{{ t(brandRefundLabels[event.outcome]) }}</strong>
      <span v-if="event.amountMinor!==null&&event.currency">{{ t('Tutar') }}: {{ money(event.amountMinor,event.currency) }}</span>
      <p v-if="event.reason">{{ t(event.reason==='additional_refund'?'Ek iade kaydı inceleme gerektiriyor.':'İade tutarı, para birimi veya zamanı uyuşmuyor.') }}</p>
      <BrandRefundReview v-if="event.reviewEventId" :reservationId="id" :eventId="event.reviewEventId"/>
    </article>
    <p v-if="data&&!data.items.length">{{ t('Karar geçmişinde gösterilecek olay yok.') }}</p>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.brk{overflow-wrap:anywhere}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
