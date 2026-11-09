<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {BrandAcceptanceData} from '~/lib/brand-acceptance-helpers';
import {brandLedgerLabels} from '@otosanayide/core/brand-payment-review';

const props = withDefaults(defineProps<{id?: string; demo?: boolean; disabled?: boolean; onBusy?: (v: boolean) => void; onAccepted?: (until: number) => void}>(), {demo: false, disabled: false});
const app = useApp();
const {t, localeTag} = useLocale();
const data = ref<BrandAcceptanceData | null>(null);
const busy = ref(false);
const error = ref('');
const now = ref(Date.now());
let lock = false;

useClientEffect(() => [], () => {
  const timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  return () => clearInterval(timer);
});

async function run(method: 'GET' | 'POST') {
  const id = props.id;
  if (!id || props.demo || lock) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  error.value = '';
  data.value = null;
  try {
    const r = await apiFetch('/api/admin/brand-acceptance' + (method === 'GET' ? '?' + new URLSearchParams({reservationId: id}) : ''), {method, headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`, ...(method === 'POST' ? {'Content-Type': 'application/json'} : {})}, body: method === 'POST' ? JSON.stringify({reservationId: id}) : undefined, cache: 'no-store'}), d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (d.reservationId !== id || d.acceptance && d.acceptance.reservationId !== id) throw Error('Reklam ödeme kaydı doğrulanamadı. Yenile.');
    data.value = d;
    if (d.acceptance) props.onAccepted?.(d.acceptance.committedUntilMs);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    busy.value = false;
    props.onBusy?.(false);
  }
}

const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Reklam Kabulü ve Kesin Yer Ayrımı') }}</h4>
    <p class="notice">{{ t('Kabul, doğrulanmış ödeme için reklam alanını kampanya bitimine kadar korur. Reklamı yayımlamaz ve yeni tahsilat yapmaz.') }}</p>
    <p v-if="demo||!id">{{ t('Kabul durumunu görmek için gerçek reklam rezervasyonunu yükle.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="busy||disabled" @click="void run('GET')">{{ t('Kabul durumunu yenile') }}</button>
      <template v-if="data">
        <p>{{ t(brandLedgerLabels[data.payment.status]??'Bilgi yok') }}</p>
        <p v-if="!data.enabled">{{ t('Yeni reklam kabulleri kapalı. Mevcut kabul kayıtları okunabilir.') }}</p>
        <div v-if="data.acceptance" role="status" class="notice stack">
          <strong>{{ t(now>=data.acceptance.committedUntilMs?'Kesin ayrım süresi sona erdi':'Reklam alanı kesin ayrıldı') }}</strong>
          <span>{{ t('Kabul tarihi') }}: {{ time(data.acceptance.acceptedAtMs) }}</span>
          <span>{{ t('Kapasite koruma sonu') }}: {{ time(data.acceptance.committedUntilMs) }} · {{ t('İstanbul saati') }}</span>
          <small>{{ t('Bu kayıt geçmiş kabulü gösterir. Güncel ödeme ve yayın uygunluğu ayrıca değerlendirilir.') }}</small>
        </div>
        <template v-else>
          <p>{{ t('Bu rezervasyon için henüz kesin kabul yok.') }}</p>
          <button class="button primary" :disabled="busy||disabled||!data.enabled||!data.eligible||!data.expiresAtMs||now>=data.expiresAtMs" @click="void run('POST')">{{ t('Ödemeyi Kabul Et ve Reklam Alanını Ayır') }}</button>
          <small>{{ t('Kabul sırasında ödeme ve rezervasyon koşulları sunucuda yeniden doğrulanır.') }}</small>
        </template>
        <small>{{ t('Son sunucu kontrolü') }}: {{ time(data.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      </template>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
  </section>
</template>
