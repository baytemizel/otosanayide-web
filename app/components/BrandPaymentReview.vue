<script setup lang="ts">
import {ref} from 'vue';
import BrandReviewDecision from '~/components/BrandReviewDecision.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {brandReviewQuery, brandReviewReasons, brandLedgerLabels, type BrandReviewView, type brandLedgerView} from '@otosanayide/core/brand-payment-review';

const statuses: Record<string, string> = {open: 'Açık dosya', reviewing: 'İnceleniyor', refund_required: 'İade incelemesi gerekli', closed: 'Dosya kapatıldı', unknown: 'Bilgi yok'};
const app = useApp();
const {t, localeTag} = useLocale();
const items = ref<BrandReviewView[]>([]);
const next = ref<string | null>(null);
const loaded = ref(false);
const busy = ref(false);
const error = ref('');
const id = ref('');
const payment = ref<ReturnType<typeof brandLedgerView> | null>(null);
let lock = false;
const time = (v: number | null) => v === null ? t('Bilgi yok') : new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
const money = (v: {minor: number; currency: string} | null) => v ? new Intl.NumberFormat(localeTag.value, {style: 'currency', currency: v.currency}).format(v.minor / 100) : t('Bilgi yok');

async function run(query: {after?: string} | {recordId: string}) {
  if (lock || app.demo) return;
  lock = true;
  busy.value = true;
  error.value = '';
  const lookup = 'recordId' in query;
  if (lookup) payment.value = null;
  else {
    items.value = [];
    next.value = null;
    loaded.value = false;
  }
  try {
    const input = brandReviewQuery.safeParse(query);
    if (!input.success) throw Error('Geçerli bir reklam ödeme referansı gir.');
    const r = await apiFetch('/api/admin/brand-payment-review?' + new URLSearchParams(query), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (lookup) payment.value = d.payment;
    else {
      items.value = d.items;
      next.value = d.next;
      loaded.value = true;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    busy.value = false;
  }
}

function submitLookup(e: Event) {
  e.preventDefault();
  void run({recordId: id.value.trim()});
}

function changeId(e: Event) {
  id.value = (e.target as HTMLInputElement).value;
  payment.value = null;
}

function applyDecision(itemId: string, d: {status: any; version: number; note: string}) {
  items.value = items.value.map(v => v.id === itemId ? {...v, ...d} : v);
}
</script>

<template>
  <section class="panel stack">
    <h2>{{ t('Marka Reklamı Ödeme İncelemeleri') }}</h2>
    <p class="notice">{{ t('İnceleme kararları gerekçesiyle kaydedilir. Karar kaydetmek para iadesi yapmaz veya reklam yayımlamaz.') }}</p>
    <p v-if="app.demo">{{ t('Demo modunda gerçek marka ödeme kayıtları gösterilmez.') }}</p>
    <template v-else>
      <div class="row" :style="{flexWrap:'wrap'}">
        <button class="button secondary" :disabled="busy||!app.user" @click="void run({})">{{ t('İnceleme kuyruğunu yenile') }}</button>
        <button v-if="next" class="button secondary" :disabled="busy" @click="void run({after:next!})">{{ t('Sonraki sayfa') }}</button>
      </div>
      <p class="small muted">{{ t('Dosyalar referans sırasıyla, sayfa başına 20 kayıt gösterilir.') }}</p>
      <form class="stack" @submit="submitLookup">
        <label>{{ t('Reklam ödeme referansı') }}<input :value="id" maxlength="36" :disabled="busy" @input="changeId"/></label>
        <button class="button secondary" :disabled="busy||!app.user">{{ t('Ödeme kaydının durumunu sorgula') }}</button>
      </form>
      <div v-if="payment" role="status" class="notice">
        <strong>{{ t(brandLedgerLabels[payment.status]) }}</strong>
        <p :style="{overflowWrap:'anywhere'}">{{ payment.recordId }}</p>
        <small>{{ t('Son sunucu kontrolü') }}: {{ time(payment.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      </div>
      <p v-if="loaded&&!items.length" role="status">{{ t('Ödeme inceleme dosyası bulunamadı.') }}</p>
      <article v-for="item in items" :key="item.id" class="panel stack">
        <strong>{{ t(brandReviewReasons[item.reason]??'Diğer ödeme uyuşmazlığı') }}</strong>
        <span class="badge">{{ t(statuses[item.status]??'Bilgi yok') }}</span>
        <small :style="{overflowWrap:'anywhere'}">{{ t('Dosya referansı') }}: {{ item.id }}</small>
        <small :style="{overflowWrap:'anywhere'}">{{ t('Reklam ödeme referansı') }}: {{ item.recordId??t('Bilgi yok') }}</small>
        <div class="form-grid">
          <p>{{ t('Reklam tutarı') }}: <strong>{{ money(item.expected) }}</strong></p>
          <p>{{ t('Alınan ödeme') }}: <strong>{{ money(item.received) }}</strong></p>
        </div>
        <p>{{ t(brandLedgerLabels[item.payment.status]) }}</p>
        <small>{{ t('Dosya tarihi') }}: {{ time(item.createdAtMs) }} · {{ t('İstanbul saati') }}</small>
        <small>{{ t('Son sunucu kontrolü') }}: {{ time(item.payment.checkedAtMs) }}</small>
        <BrandReviewDecision :key="`${item.id}-${item.version}`" :item="item" :onSaved="d=>applyDecision(item.id,d)"/>
      </article>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
  </section>
</template>
