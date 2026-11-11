<script setup lang="ts">
import {computed, ref, useId} from 'vue';
import {ArrowRight, Check, Clock, FileText, TriangleAlert} from '@lucide/vue';
import {turkeyAppointmentTime} from '@otosanayide/core/request-operations';
import {useLocale} from '~/composables/useLocale';
import type {RequestItem} from '~/lib/request-board-helpers';
import RequestMessages from '~/components/RequestMessages.vue';
import {contractReady} from '~/lib/contract';
import {offerExtras} from '~/lib/member-api';

const props = withDefaults(defineProps<{item: RequestItem; business?: boolean; onAction: (value: Record<string, unknown>) => Promise<void>}>(), {business: false});

const {t: i18nT, localeTag} = useLocale();
const text = ref('');
const price = ref('');
const start = ref('');
const busy = ref(false);
const error = ref('');
const confirm = ref('');
const active = computed(() => ['requested', 'offered', 'confirmed'].includes(props.item.status));
const statusLabels: Record<string, string> = {requested: 'İşletme yanıtı bekleniyor', offered: 'Kullanıcı onayı bekleniyor', confirmed: 'Kesinleşti', declined: 'İşletme reddetti', cancelled: 'İptal edildi', completed: 'Tamamlandı'};
const statusTone: Record<string, string> = {requested: 'warn', offered: 'warn', confirmed: 'ok', declined: 'err', cancelled: 'neu', completed: 'ok'};
const formId = useId();
/** portal-05 offer lines arrive only on GET /api/requests?v=2 and are read apart from RequestItem. */
const extras = computed(() => (props.item.offer ? offerExtras(props.item.offer) : null));
const preferredStartsAt = computed(() => {
  const raw = (props.item as {preferredStartsAt?: unknown}).preferredStartsAt;
  return typeof raw === 'string' && !Number.isNaN(Date.parse(raw)) ? raw : '';
});
const lineLabels: Record<string, string> = {labour: 'İşçilik', parts: 'Parça', tax: 'KDV', other: 'Diğer'};
const money = (minor: number) => (minor / 100).toLocaleString(localeTag.value, {style: 'currency', currency: 'TRY'});
const timeline = computed(() => {
  const r = props.item;
  return [
    {label: 'Talep gönderildi', sub: '', icon: Check, tone: 'ok'},
    ...(r.offer ? [{label: r.kind === 'quotes' ? 'Teklif hazırlandı' : 'Saat önerildi', sub: '', icon: FileText, tone: 'o'}] : []),
    {label: statusLabels[r.status] ?? 'Belirtilmedi', sub: r.status === 'offered' && r.offer ? `${i18nT('Geçerlilik')}: ${new Date(r.offer.expiresAtMs).toLocaleDateString(localeTag.value, {timeZone: 'Europe/Istanbul'})}` : '', icon: Clock, tone: ['confirmed', 'completed'].includes(r.status) ? 'ok' : 'neu'},
  ];
});

async function run(action: string) {
  const r = props.item;
  busy.value = true;
  error.value = '';
  try {
    await props.onAction({id: r.id, version: r.version, action, ...(action === 'offer' ? {text: text.value, ...(r.kind === 'quotes' ? {price: Number(price.value)} : {startsAt: turkeyAppointmentTime(start.value)})} : ['cancel', 'decline'].includes(action) ? {text: text.value} : {})});
    confirm.value = '';
  } catch (e) {
    error.value = e instanceof Error ? (e.message.startsWith('[') ? 'Bilgileri kontrol edin.' : e.message) : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
function submitOffer(e: Event) {
  e.preventDefault();
  void run('offer');
}
</script>

<template>
  <article :class="`rc ${business?'biz':''}`">
    <div class="ds-card main">
      <header class="head">
        <div class="ds-col ds-f1">
          <span class="ds-xs ds-muted">{{ i18nT(item.kind==='quotes'?'Teklif talebi':'Randevu talebi') }}</span>
          <h3 :class="business?'t15':'ds-serif t28'">{{ item.service }}</h3>
        </div>
        <span role="status" :class="`ds-badge ${statusTone[item.status]??'neu'}`">{{ i18nT(statusLabels[item.status]??'Belirtilmedi') }}</span>
      </header>
      <div class="body ds-col ds-g16">
        <div class="ds-col ds-g4">
          <NuxtLink class="ds-small ds-b biz-link" :to="`/servis/${encodeURIComponent(item.businessId)}`">{{ item.businessName }}</NuxtLink>
          <p class="ds-small ds-muted">{{ item.vehicle }}</p>
        </div>
        <p class="review-text message">{{ item.message }}</p>
        <p v-if="preferredStartsAt" class="ds-small ds-muted">{{ i18nT('İstenen saat') }}: {{ new Date(preferredStartsAt).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ i18nT('Türkiye saati') }} · {{ i18nT('onay değildir') }}</p>
        <p v-else-if="item.preferredDate" class="ds-small ds-muted">{{ i18nT('Tercih ettiğin tarih') }}: {{ item.preferredDate }}</p>
        <template v-if="item.offer">
          <div v-if="extras?.lines" class="ds-card ds-table-wrap table">
            <table class="ds-table">
              <thead><tr><th scope="col">{{ i18nT('Kalem') }}</th><th scope="col">{{ i18nT('Açıklama') }}</th><th scope="col" class="num">{{ i18nT('Tutar') }}</th></tr></thead>
              <tbody>
                <tr v-for="(line, i) in extras.lines" :key="i"><td>{{ i18nT(lineLabels[line.kind] ?? 'Diğer') }}</td><td>{{ line.label }}</td><td class="num">{{ money(line.amountMinor) }}</td></tr>
                <tr><td colspan="2" class="ds-b">{{ i18nT('Toplam (tahmini)') }}</td><td class="num ds-b total">{{ money(extras.totalMinor!) }}</td></tr>
              </tbody>
            </table>
          </div>
          <p v-if="extras?.excluded" class="ds-small"><b>{{ i18nT('Dahil olmayan') }}:</b> {{ extras.excluded }}</p>
          <div v-if="!extras?.lines&&item.offer.price!==undefined" class="ds-card ds-table-wrap table">
            <table class="ds-table">
              <thead><tr><th scope="col">{{ i18nT('Kalem') }}</th><th scope="col">{{ i18nT('Açıklama') }}</th><th scope="col" class="num">{{ i18nT('Tutar') }}</th></tr></thead>
              <tbody>
                <tr><td>{{ i18nT('Ön teklif') }}</td><td>{{ item.service }}</td><td class="num">{{ item.offer.price.toLocaleString(localeTag,{style:'currency',currency:'TRY'}) }}</td></tr>
                <tr><td colspan="2" class="ds-b">{{ i18nT('Toplam (tahmini)') }}</td><td class="num ds-b total">{{ item.offer.price.toLocaleString(localeTag,{style:'currency',currency:'TRY'}) }}</td></tr>
              </tbody>
            </table>
          </div>
          <div v-if="item.offer.price!==undefined&&!business&&extras?.mayChangeAfterInspection!==false" class="ds-note warn"><TriangleAlert :size="16" class="ds-i"/><span>{{ i18nT('Ön inceleme sonrası değişebilir.') }}</span></div>
          <p v-if="item.offer.startsAt" class="ds-small ds-b">{{ new Date(item.offer.startsAt).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ i18nT('Türkiye saati') }}</p>
          <p v-if="item.status==='offered'" class="ds-small ds-muted">{{ i18nT('Yanıtın son kabul zamanı') }}: {{ new Date(item.offer.expiresAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }}</p>
        </template>
        <section v-if="item.offer||!business" class="ds-col ds-g10">
          <h4 class="t16">{{ i18nT('Mesajlar') }}</h4>
          <div v-if="item.offer" class="bubble"><p class="review-text ds-small">{{ item.offer.text }}</p><span class="ds-xs ds-muted">{{ i18nT('İşletme') }}</span></div>
          <RequestMessages v-if="!business&&contractReady.requestsV2" :requestId="item.id" :open="['requested','offered','confirmed'].includes(item.status)"/>
          <div v-else-if="!business" class="send"><input class="ds-field ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')" :aria-label="i18nT('Mesaj yaz…')" :placeholder="i18nT('Mesaj yaz…')"/><ArrowRight :size="18" class="ds-i"/></div>
        </section>
        <p v-if="item.resolution" class="review-text ds-small">{{ item.resolution }}</p>
        <template v-if="active">
          <form v-if="business&&['requested','offered'].includes(item.status)" :id="formId" class="ds-col ds-g16" @submit="submitOffer">
            <h4 class="t16">{{ i18nT(item.kind==='quotes'?'Ön teklif hazırla':'Randevu saati öner') }}</h4>
            <div v-if="item.kind==='quotes'" class="ds-card ds-table-wrap table ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
              <table class="ds-table">
                <thead><tr><th scope="col">{{ i18nT('Kalem') }}</th><th scope="col">{{ i18nT('Açıklama') }}</th><th scope="col">{{ i18nT('Tutar') }}</th></tr></thead>
                <tbody><tr v-for="row in ['İşçilik','Parça','KDV']" :key="row"><td>{{ i18nT(row) }}</td><td>—</td><td>—</td></tr></tbody>
              </table>
            </div>
            <label class="f"><span class="ds-label">{{ i18nT('İşletme açıklaması') }}</span><textarea class="ds-field" v-model="text" required minlength="10" maxlength="2000" :disabled="busy"/></label>
            <div class="grid2">
              <label v-if="item.kind==='quotes'" class="f"><span class="ds-label">{{ i18nT('Teklif tutarı (TL)') }}</span><input class="ds-field" type="number" min="0.01" max="10000000" step="0.01" :value="price" required :disabled="busy" @input="price=($event.target as HTMLInputElement).value"/></label>
              <label v-else class="f"><span class="ds-label">{{ i18nT('Önerilen kabul saati (Türkiye)') }}</span><input class="ds-field" v-model="start" type="datetime-local" step="3600" required :disabled="busy"/></label>
              <label class="f"><span class="ds-label">{{ i18nT('Geçerlilik') }}</span><select class="ds-field ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><option>{{ i18nT('Belirtilmedi') }}</option></select></label>
            </div>
            <label class="f"><span class="ds-label">{{ i18nT('Dahil olmayan') }}</span><input class="ds-field ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"/></label>
            <label class="ds-row ds-g10"><input class="ds-check ds-passive" type="checkbox" disabled aria-disabled="true" :title="i18nT('Yakında')"/><span class="ds-small">{{ i18nT('“Ön inceleme sonrası değişebilir” koşulunu göster') }}</span></label>
            <p class="ds-xs ds-muted">{{ item.kind==='appointments'?i18nT('Saat önerisi yer ayırmaz. Kullanıcı kabulünde saat başına bir randevu ayrılır; işlem süresi garanti edilmez.'):i18nT('Teklifin kapsadığı parça ve işçiliği açıklamada belirt.') }}</p>
          </form>
          <div class="ds-row ds-wrap ds-g10">
            <button v-if="business&&['requested','offered'].includes(item.status)" type="submit" :form="formId" class="ds-btn p" :disabled="busy">{{ i18nT(item.kind==='quotes'?'Teklifi gönder':'Öneriyi gönder') }}</button>
            <button v-if="!business&&item.status==='offered'" type="button" class="ds-btn p lg" :disabled="busy||item.offer!.expiresAtMs<=Date.now()" @click="confirm='accept'">{{ i18nT('Öneriyi kabul et') }}</button>
            <button v-if="business&&item.status==='confirmed'" type="button" class="ds-btn s" :disabled="busy" @click="confirm='complete'">{{ i18nT('Tamamlandı olarak işaretle') }}</button>
            <button v-if="['requested','offered'].includes(item.status)" type="button" :class="`ds-btn s ds-passive ${business?'':'lg'}`" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Ek bilgi iste') }}</button>
            <button v-if="business&&['requested','offered'].includes(item.status)" type="button" class="ds-btn g" :disabled="busy" @click="confirm='decline'">{{ i18nT('Reddet') }}</button>
            <button type="button" :class="`ds-btn ${business?'g':'d lg'}`" :disabled="busy" @click="confirm='cancel'">{{ i18nT('Talebi iptal et') }}</button>
          </div>
        </template>
        <section v-if="confirm" class="ds-note warn ds-col confirm">
          <p>{{ i18nT(confirm==='accept'?'Kabul edince talep kesinleşir. Bu ekranda ödeme alınmaz.':confirm==='complete'?'Hizmetin tamamlandığını onaylıyor musun?':'İptal veya ret gerekçesi gerekli.') }}</p>
          <label v-if="['cancel','decline'].includes(confirm)" class="f"><span class="ds-label">{{ i18nT('Gerekçe') }}</span><textarea class="ds-field" v-model="text" minlength="10" maxlength="1000" :disabled="busy"/></label>
          <div class="ds-row ds-wrap ds-g10">
            <button type="button" class="ds-btn p" :disabled="busy||(['cancel','decline'].includes(confirm)&&text.trim().length<10)" @click="run(confirm)">{{ i18nT('İşlemi onayla') }}</button>
            <button type="button" class="ds-btn s" :disabled="busy" @click="confirm=''">{{ i18nT('Vazgeç') }}</button>
          </div>
        </section>
        <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
      </div>
    </div>
    <aside v-if="!business" class="ds-card ds-pad24 ds-col ds-g16 side">
      <h4 class="t19">{{ i18nT('Durum') }}</h4>
      <div v-for="step in timeline" :key="step.label" class="ds-row ds-g12 step">
        <span :class="`dot ${step.tone}`"><component :is="step.icon" :size="14"/></span>
        <div class="ds-col ds-f1"><strong class="ds-small">{{ i18nT(step.label) }}</strong><span v-if="step.sub" class="ds-xs ds-muted">{{ step.sub }}</span></div>
      </div>
    </aside>
  </article>
</template>

<style scoped>
p, h3, h4 {margin: 0;}
.rc {display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; align-items: start;}
.rc.biz {grid-template-columns: minmax(0, 1fr);}
.main {min-width: 0;}
.head {display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 28px 28px 0;}
.body {padding: 16px 28px 28px;}
.biz .head {padding: 20px; border-bottom: 1px solid #edf0f3;}
.biz .body {padding: 24px;}
.t28 {font-size: 28px; line-height: 31.36px; overflow-wrap: anywhere;}
.t15 {font-size: 15px; line-height: 22.5px; font-weight: 700; overflow-wrap: anywhere;}
.t16, .t19 {font-family: Arimo, Arial, Helvetica, sans-serif; font-weight: 700;}
.t16 {font-size: 16px; line-height: 21.6px;}
.t19 {font-size: 19px; line-height: 24.7px;}
.biz-link {color: #10243a; overflow-wrap: anywhere;}
.message {font-size: 15px; line-height: 22.5px;}
.table {overflow: hidden;}
.table .ds-table tr:last-child td {border-bottom: 0;}
.num {text-align: right;}
.total {font-size: 18px;}
.bubble {display: flex; flex-direction: column; align-self: flex-start; max-width: min(380px, 100%); padding: 10px 14px; background: #f4f6f8; border-radius: 12px 12px 12px 4px;}
.send {position: relative; display: flex; align-items: center;}
.send .ds-field {padding-right: 42px;}
.send .ds-i {position: absolute; right: 14px; color: #586879;}
.f {display: block; min-width: 0;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
.grid2 {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;}
input.ds-check {min-height: 0; padding: 0;}
.confirm {align-items: stretch;}
.step {align-items: flex-start;}
.dot {display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border-radius: 14px; background: #f4f6f8; color: #586879;}
.dot.ok {background: #e8f4ee; color: #21684e;}
.dot.o {background: #fff3ec; color: #c4460b;}
@media (max-width: 1100px) {
  .rc {grid-template-columns: minmax(0, 1fr); gap: 16px;}
}
@media (max-width: 480px) {
  .head {padding: 20px 16px 0;}
  .body {padding: 12px 16px 20px;}
  .biz .head {padding: 16px;}
  .biz .body {padding: 16px;}
  .t28 {font-size: 24px; line-height: 28px;}
  .grid2 {grid-template-columns: minmax(0, 1fr);}
}
</style>
