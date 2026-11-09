<script setup lang="ts">
import {computed, ref} from 'vue';
import HostedCheckoutButton from '~/components/HostedCheckoutButton.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {brandOrderView} from '@otosanayide/core/brand-orders';

type Order = ReturnType<typeof brandOrderView>;
const props = withDefaults(defineProps<{hold?: {id: string; status: string; expiresAtMs: number}; demo?: boolean; disabled?: boolean; onBusy?: (b: boolean) => void}>(), {demo: false, disabled: false});
const app = useApp();
const {t, localeTag} = useLocale();
const order = ref<Order | null>(null);
const loaded = ref(false);
const enabled = ref(false);
const checkoutReady = ref(false);
const busy = ref(false);
const error = ref('');
const checked = ref(0);
const now = ref(Date.now());
let lock = false;

useClientEffect(() => [props.hold?.id, props.hold?.expiresAtMs], () => {
  if (!props.hold) return;
  now.value = Date.now();
  const id = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  return () => clearInterval(id);
});

async function run(method: 'GET' | 'POST') {
  const hold = props.hold;
  if (!hold || props.demo || lock) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  error.value = '';
  try {
    const r = await apiFetch('/api/admin/brand-orders' + (method === 'GET' ? '?' + new URLSearchParams({reservationId: hold.id}) : ''), {method, headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`, ...(method === 'POST' ? {'Content-Type': 'application/json'} : {})}, body: method === 'POST' ? JSON.stringify({reservationId: hold.id}) : undefined, cache: 'no-store'}), d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (d.order && (d.order.reservationId !== hold.id || d.order.id !== hold.id || d.order.payable !== false || !['prepared', 'expired', 'cancelled', 'invalidated'].includes(d.order.status))) throw Error(t('Reklam ödeme kaydı doğrulanamadı. Yenile.'));
    order.value = d.order;
    loaded.value = true;
    checked.value = Date.now();
    if (method === 'GET') {
      enabled.value = d.enabled === true;
      checkoutReady.value = d.checkoutEnabled === true;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    busy.value = false;
    props.onBusy?.(false);
  }
}

const status = computed(() => order.value ? (now.value >= order.value.expiresAtMs ? 'expired' : props.hold?.status === 'released' ? 'cancelled' : order.value.status) : null);
const labels = {prepared: 'Reklam ödeme hazırlık kaydı mevcut', expired: 'Reklam ödeme kaydının süresi doldu', cancelled: 'Rezervasyon iptal edildi', invalidated: 'Reklam rezervasyonunun koşulları değişti'};
const money = (v: number) => new Intl.NumberFormat(localeTag.value, {style: 'currency', currency: 'TRY'}).format(v / 100);
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Reklam Rezervasyonu ve Ödeme Durumu') }}</h4>
    <p class="notice">{{ t('Bu kayıt yalnız banner reklamının ödeme hazırlığıdır. Henüz tahsilat veya yayın başlatılmaz.') }}</p>
    <p v-if="demo||!hold">{{ t(demo?'Demo modunda gerçek reklam ödeme kaydı oluşturulmaz.':'Ödeme durumunu görmek için reklam rezervasyonunu yükle.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="busy||disabled" @click="void run('GET')">{{ t('Reklam ödeme durumunu yenile') }}</button>
      <p v-if="loaded&&!enabled">{{ t('Reklam ödeme hazırlığı kapalı. Mevcut kayıtlar okunabilir.') }}</p>
      <p v-if="loaded&&!order&&!error">{{ t('Bu reklam rezervasyonu için ödeme hazırlığı yapılmadı.') }}</p>
      <button v-if="loaded&&enabled&&!order" class="button primary" :disabled="busy||disabled||hold.status!=='held'||hold.expiresAtMs<=now" @click="void run('POST')">{{ t('Reklam ödeme kaydını hazırla') }}</button>
      <div v-if="order&&status" class="notice stack" role="status">
        <strong>{{ t(labels[status]) }}</strong>
        <small :style="{overflowWrap:'anywhere'}">{{ t('Reklam ödeme referansı') }}: {{ order.id }}</small>
        <span>{{ t('Ara toplam') }}: {{ money(order.subtotalMinor) }}</span>
        <span>{{ t('Vergi') }}: {{ money(order.taxMinor) }}</span>
        <strong>{{ t('Kayıtlı toplam') }}: {{ money(order.totalMinor) }}</strong>
        <small>{{ t('Geçerlilik sonu') }}: {{ time(order.expiresAtMs) }} · {{ t('İstanbul saati') }}</small>
        <p v-if="status!=='prepared'">{{ t('Bu kayıtla işlem yapılamaz. Güncel rezervasyon ve koşulları kontrol et.') }}</p>
      </div>
      <HostedCheckoutButton v-if="checkoutReady&&order&&status==='prepared'&&hold?.status==='held'" kind="brand" :reservationId="hold.id" :disabled="busy||disabled"/>
      <small v-if="checked>0">{{ t('Son sunucu kontrolü') }}: {{ time(checked) }} · {{ t('İstanbul saati') }}</small>
      <p class="small muted">{{ t('Durum istek üzerine yenilenir. Yanıt kaybolursa yenile veya aynı düğmeyle tekrar dene; ödeme kaydı çoğaltılmaz.') }}</p>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
  </section>
</template>
