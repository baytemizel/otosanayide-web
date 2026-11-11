<script setup lang="ts">
import {ref} from 'vue';
import {Check, Clock, Lock, X} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {brandAcceptanceResponse, readAdResponse} from '~/lib/ads-client';
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
    const r = await apiFetch('/api/admin/brand-acceptance' + (method === 'GET' ? '?' + new URLSearchParams({reservationId: id}) : ''), {method, headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`, ...(method === 'POST' ? {'Content-Type': 'application/json'} : {})}, body: method === 'POST' ? JSON.stringify({reservationId: id}) : undefined, cache: 'no-store'}), d = await readAdResponse(r, raw => brandAcceptanceResponse.parse(raw));
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
const ledger: Record<string, {icon: typeof Check; cls: string}> = {verified: {icon: Check, cls: 'i-ok'}, pending: {icon: Clock, cls: 'i-warn'}, needs_review: {icon: Clock, cls: 'i-warn'}, failed: {icon: X, cls: 'i-err'}};
const ledgerState = (s: string) => ledger[s] ?? {icon: Lock, cls: 'i-neu'};
</script>

<template>
  <section class="sec ds-col ds-g12">
    <h4>{{ t('Reklam Kabulü ve Kesin Yer Ayrımı') }}</h4>
    <p class="ds-note info ds-col">{{ t('Kabul, doğrulanmış ödeme için reklam alanını kampanya bitimine kadar korur. Reklamı yayımlamaz ve yeni tahsilat yapmaz.') }}</p>
    <p v-if="demo||!id">{{ t('Kabul durumunu görmek için gerçek reklam rezervasyonunu yükle.') }}</p>
    <template v-else>
      <button class="ds-btn s" :disabled="busy||disabled" @click="void run('GET')">{{ t('Kabul durumunu yenile') }}</button>
      <template v-if="data">
        <div class="res">
          <span :class="['ic',ledgerState(data.payment.status).cls]"><component :is="ledgerState(data.payment.status).icon" :size="34" :stroke-width="1.8" aria-hidden="true"/></span>
          <strong class="ttl">{{ t(brandLedgerLabels[data.payment.status]??'Bilgi yok') }}</strong>
        </div>
        <p v-if="!data.enabled">{{ t('Yeni reklam kabulleri kapalı. Mevcut kabul kayıtları okunabilir.') }}</p>
        <div v-if="data.acceptance" role="status" class="ds-note info ds-col">
          <strong>{{ t(now>=data.acceptance.committedUntilMs?'Kesin ayrım süresi sona erdi':'Reklam alanı kesin ayrıldı') }}</strong>
          <span>{{ t('Kabul tarihi') }}: {{ time(data.acceptance.acceptedAtMs) }}</span>
          <span>{{ t('Kapasite koruma sonu') }}: {{ time(data.acceptance.committedUntilMs) }} · {{ t('İstanbul saati') }}</span>
          <small class="ds-xs ds-muted">{{ t('Bu kayıt geçmiş kabulü gösterir. Güncel ödeme ve yayın uygunluğu ayrıca değerlendirilir.') }}</small>
        </div>
        <template v-else>
          <p>{{ t('Bu rezervasyon için henüz kesin kabul yok.') }}</p>
          <button class="ds-btn p" :disabled="busy||disabled||!data.enabled||!data.eligible||!data.expiresAtMs||now>=data.expiresAtMs" @click="void run('POST')">{{ t('Ödemeyi Kabul Et ve Reklam Alanını Ayır') }}</button>
          <small class="ds-xs ds-muted">{{ t('Kabul sırasında ödeme ve rezervasyon koşulları sunucuda yeniden doğrulanır.') }}</small>
        </template>
        <small class="ds-xs ds-muted">{{ t('Son sunucu kontrolü') }}: {{ time(data.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      </template>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.res{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:36px 28px;border:1px solid #dfe5eb;border-radius:14px;background:#fff}
.ttl{font-size:19px;line-height:1.3}
.ic{width:72px;height:72px;border-radius:36px;display:flex;align-items:center;justify-content:center}
.i-ok{background:#e8f4ee;color:#21684e}
.i-warn{background:#fff6df;color:#8a5a00}
.i-err{background:#fdecea;color:#b42318}
.i-neu{background:#f0f2f5;color:#536276}
@media(max-width:480px){.res{padding:24px 16px}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
