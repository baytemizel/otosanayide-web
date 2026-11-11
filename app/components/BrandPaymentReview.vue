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
const tones: Record<string, string> = {open: 'warn', reviewing: 'info', refund_required: 'err', closed: 'neu', unknown: 'neu'};
const openId = ref('');
</script>

<template>
  <section class="ds-card">
    <div class="hd"><h2>{{ t('Marka Reklamı Ödeme İncelemeleri') }}</h2></div>
    <div class="body ds-col ds-g12">
      <p class="ds-note info">{{ t('İnceleme kararları gerekçesiyle kaydedilir. Karar kaydetmek para iadesi yapmaz veya reklam yayımlamaz.') }}</p>
      <p v-if="app.demo" class="ds-muted">{{ t('Demo modunda gerçek marka ödeme kayıtları gösterilmez.') }}</p>
      <template v-else>
        <div class="ds-row ds-g8 ds-wrap">
          <button class="ds-btn s sm" :disabled="busy||!app.user" @click="void run({})">{{ t('İnceleme kuyruğunu yenile') }}</button>
          <button v-if="next" class="ds-btn s sm" :disabled="busy" @click="void run({after:next!})">{{ t('Sonraki sayfa') }}</button>
        </div>
        <p class="ds-xs ds-muted">{{ t('Dosyalar referans sırasıyla, sayfa başına 20 kayıt gösterilir.') }}</p>
        <form class="lookup" @submit="submitLookup">
          <label class="fld"><span class="ds-label">{{ t('Reklam ödeme referansı') }}</span><input class="ds-field" :value="id" maxlength="36" :disabled="busy" @input="changeId"/></label>
          <button class="ds-btn s" :disabled="busy||!app.user">{{ t('Ödeme kaydının durumunu sorgula') }}</button>
        </form>
        <div v-if="payment" role="status" class="ds-note info ds-col">
          <strong>{{ t(brandLedgerLabels[payment.status]) }}</strong>
          <p class="brk">{{ payment.recordId }}</p>
          <small class="ds-xs ds-muted">{{ t('Son sunucu kontrolü') }}: {{ time(payment.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
        </div>
        <p v-if="loaded&&!items.length" role="status" class="ds-muted">{{ t('Ödeme inceleme dosyası bulunamadı.') }}</p>
      </template>
      <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
      <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
    </div>
    <div v-if="!app.demo&&items.length" class="ds-table-wrap">
      <table class="ds-table">
        <thead class="tt"><tr><th>{{ t('Sipariş') }}</th><th>{{ t('Tutar') }}</th><th>{{ t('Durum') }}</th><th>{{ t('Kanıt') }}</th><th><span class="sr">{{ t('İşlem') }}</span></th></tr></thead>
        <tbody v-for="item in items" :key="item.id">
          <tr>
            <td :data-label="t('Sipariş')">
              <strong>{{ t(brandReviewReasons[item.reason]??'Diğer ödeme uyuşmazlığı') }}</strong>
              <small class="ds-xs ds-muted brk">{{ t('Dosya referansı') }}: {{ item.id }}</small>
              <small class="ds-xs ds-muted brk">{{ t('Reklam ödeme referansı') }}: {{ item.recordId??t('Bilgi yok') }}</small>
              <small class="ds-xs ds-muted">{{ t('Dosya tarihi') }}: {{ time(item.createdAtMs) }} · {{ t('İstanbul saati') }}</small>
            </td>
            <td :data-label="t('Tutar')">
              <div class="ds-xs"><span class="ds-muted">{{ t('Reklam tutarı') }}:</span> <strong>{{ money(item.expected) }}</strong></div>
              <div class="ds-xs"><span class="ds-muted">{{ t('Alınan ödeme') }}:</span> <strong>{{ money(item.received) }}</strong></div>
            </td>
            <td :data-label="t('Durum')"><span :class="['ds-badge',tones[item.status]??'neu']">{{ t(statuses[item.status]??'Bilgi yok') }}</span></td>
            <td :data-label="t('Kanıt')">
              <span class="ds-xs">{{ t(brandLedgerLabels[item.payment.status]) }}</span>
              <small class="ds-xs ds-muted">{{ t('Son sunucu kontrolü') }}: {{ time(item.payment.checkedAtMs) }}</small>
            </td>
            <td><button type="button" class="ds-btn s sm" :aria-expanded="openId===item.id" @click="openId=openId===item.id?'':item.id">{{ t('İncele') }}</button></td>
          </tr>
          <tr v-show="openId===item.id">
            <td colspan="5" class="fcell"><BrandReviewDecision :key="`${item.id}-${item.version}`" :item="item" :onSaved="d=>applyDecision(item.id,d)"/></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.brk{overflow-wrap:anywhere}
.hd{padding:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.body{padding:0 20px 20px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(max-width:760px){table.ds-table,thead.tt{display:block}thead.tt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
.fcell{background:#f7f9fa}
@media(max-width:760px){tbody,tr,tr td{display:block}tr td{border:0;padding:6px 16px}tbody{border-bottom:1px solid #edf0f3;padding:10px 0}tr td[data-label]::before{content:attr(data-label);display:block;font-size:12px;font-weight:700;color:#586879;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}}
.lookup{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
.lookup .fld{flex:1 1 280px}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
