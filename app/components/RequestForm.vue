<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {ArrowRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Info, Upload} from '@lucide/vue';
import {requestSchema, type Business} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import {contractReady} from '~/lib/contract';
import {istanbulClock} from '~/lib/opening-hours';
import {availabilityApi, type Availability} from '~/lib/member-api';
import {useClientEffect} from '~/composables/useClientEffect';
import BusinessVisual from '~/components/BusinessVisual.vue';

const props = defineProps<{business: Business; kind: 'quotes' | 'appointments'}>();

const {t: i18nT, localeTag} = useLocale();
const app = useApp();
let requestKey = '';
const busy = ref(false);
const error = ref('');
const sent = ref(false);
// Display only: the summary card mirrors what is typed; the fields stay uncontrolled.
const picked = reactive({service: '', vehicle: '', preferredDate: ''});
function mirror(e: Event) {
  const field = e.target as HTMLInputElement;
  if (field.name === 'service' || field.name === 'vehicle' || field.name === 'preferredDate') picked[field.name] = field.value;
}
const monthLabel = computed(() => new Date().toLocaleDateString(localeTag.value, {month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul'}));
const days = computed(() => Array.from({length: 6}, (_, i) => {
  const date = new Date(Date.now() + i * 86400000);
  return {key: i, week: date.toLocaleDateString(localeTag.value, {weekday: 'short', timeZone: 'Europe/Istanbul'}), day: date.toLocaleDateString(localeTag.value, {day: 'numeric', timeZone: 'Europe/Istanbul'})};
}));
const slots = ['09.00', '10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00'];

/* web-15 (3): public availability; choosing a slot is a wish, the business still has to accept. */
const liveSlots = computed(() => contractReady.requestsV2 && !app.demo && props.kind === 'appointments');
const today = istanbulClock(new Date()).date;
const addDays = (date: string, n: number) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const weekStart = ref(today);
const availability = ref<Availability | null>(null);
const availabilityError = ref('');
const loadingSlots = ref(false);
const chosenDate = ref('');
const chosenSlot = ref('');
const dateInput = ref<HTMLInputElement | null>(null);
useClientEffect(() => [liveSlots.value, weekStart.value, props.business.id], () => {
  if (!liveSlots.value) return;
  let cancelled = false;
  loadingSlots.value = true;
  availabilityError.value = '';
  availabilityApi.read(props.business.id, weekStart.value, 7).then(v => {
    if (!cancelled) availability.value = v;
  }).catch(e => {
    if (!cancelled) availabilityError.value = e instanceof Error ? e.message : 'Uygun saatler yüklenemedi.';
  }).finally(() => {
    if (!cancelled) loadingSlots.value = false;
  });
  return () => {
    cancelled = true;
  };
});
const weekDays = computed(() => Array.from({length: 7}, (_, i) => {
  const date = addDays(weekStart.value, i);
  const at = new Date(date + 'T12:00:00+03:00');
  const day = availability.value?.days.find(d => d.date === date);
  return {date, week: at.toLocaleDateString(localeTag.value, {weekday: 'short', timeZone: 'Europe/Istanbul'}), day: at.toLocaleDateString(localeTag.value, {day: 'numeric', timeZone: 'Europe/Istanbul'}), slots: day?.slots ?? []};
}));
const chosenSlots = computed(() => weekDays.value.find(d => d.date === chosenDate.value)?.slots ?? []);
const liveMonth = computed(() => new Date(weekStart.value + 'T12:00:00+03:00').toLocaleDateString(localeTag.value, {month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul'}));
function chooseDate(date: string) {
  chosenDate.value = date;
  chosenSlot.value = '';
  picked.preferredDate = date;
  if (dateInput.value) dateInput.value.value = date;
}
function shiftWeek(n: number) {
  const next = addDays(weekStart.value, n * 7);
  if (next < today || next > addDays(today, 83)) return;
  weekStart.value = next;
}

async function submit(e: Event) {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const user = app.user;
    if (app.demo || !user) throw Error('Talep göndermek için doğrulanmış canlı hesap gerekli.');
    if (!requestKey) requestKey = crypto.randomUUID();
    const f = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    const {preferredSlot: _slot, ...fields} = f;
    const value = requestSchema.parse({...fields, businessId: props.business.id, kind: props.kind, ...(!f.preferredDate ? {preferredDate: undefined} : {})});
    // preferredSlot is not in the core request schema: it is added after the core check (web-15).
    const slot = liveSlots.value && chosenSlot.value && value.preferredDate === chosenDate.value ? {preferredSlot: chosenSlot.value} : {};
    const r = await apiFetch('/api/requests', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({...value, ...slot, requestKey})});
    const result = await responseJson(r);
    if (!r.ok) throw Error(result.error ?? 'Talep gönderilemedi.');
    sent.value = true;
  } catch (e) {
    error.value = e instanceof Error ? (e.message.startsWith('[') ? 'Alanları kontrol et; açıklama en az 10 karakter olmalı.' : e.message) : 'Talep gönderilemedi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="ds-container req">
    <div v-if="!app.ready||!app.member||sent" class="ds-card state ds-col ds-g12">
      <h1 class="h28">{{ kind==='quotes'?i18nT('Teklif iste'):i18nT('Randevu iste') }}</h1>
      <p class="ds-small ds-muted">{{ business.name }} · {{ business.city }}</p>
      <p v-if="!app.ready" class="ds-small ds-muted">{{ i18nT('Hesabın yükleniyor…') }}</p>
      <NuxtLink v-else-if="!app.member" class="ds-btn p" to="/giris">{{ i18nT('Ücretsiz hesabına giriş yap') }}</NuxtLink>
      <div v-else class="ds-note ok ds-col" role="status">
        <h2 class="t19">{{ i18nT('Talebin iletildi.') }}</h2>
        <NuxtLink class="ds-b" to="/taleplerim">{{ i18nT('Teklif ve randevular') }}</NuxtLink>
        <p>{{ i18nT('İşletmenin yanıtı bekleniyor. Bu işlem onaylanmış randevu veya fiyat taahhüdü oluşturmaz.') }}</p>
      </div>
    </div>
    <div v-else class="grid">
      <form class="ds-card main ds-col ds-g20" @submit="submit" @input="mirror">
        <template v-if="kind==='quotes'">
          <div class="ds-steps steps" aria-hidden="true">
            <div class="ds-step done"><span class="n"><Check :size="14"/></span>{{ i18nT('Hizmet') }}</div>
            <span class="ds-step-line"></span>
            <div class="ds-step done"><span class="n"><Check :size="14"/></span>{{ i18nT('Araç') }}</div>
            <span class="ds-step-line"></span>
            <div class="ds-step on"><span class="n">3</span>{{ i18nT('Sorun') }}</div>
            <span class="ds-step-line"></span>
            <div class="ds-step"><span class="n">4</span>{{ i18nT('Özet') }}</div>
          </div>
          <div class="ds-col">
            <h1 class="h28">{{ i18nT('Sorunu anlat') }}</h1>
            <p class="ds-small ds-muted">{{ i18nT('İşletme açıklamana göre ön teklif hazırlar. Kesin fiyat ön inceleme sonrası değişebilir.') }}</p>
          </div>
        </template>
        <template v-else>
          <h1 class="h28">{{ i18nT('Randevu zamanı seç') }}</h1>
          <template v-if="liveSlots">
            <div class="ds-row ds-sb">
              <strong class="month">{{ liveMonth }}</strong>
              <div class="ds-row ds-g8">
                <button type="button" class="ds-iconbtn" :disabled="weekStart<=today||loadingSlots" :aria-label="i18nT('Önceki hafta')" @click="shiftWeek(-1)"><ChevronLeft :size="18"/></button>
                <button type="button" class="ds-iconbtn" :disabled="loadingSlots" :aria-label="i18nT('Sonraki hafta')" @click="shiftWeek(1)"><ChevronRight :size="18"/></button>
              </div>
            </div>
            <p v-if="availabilityError" class="ds-note err" role="alert">{{ i18nT(availabilityError) }}</p>
            <p v-else-if="availability&&availability.slotMinutes===null" class="ds-note info">{{ i18nT('Bu işletme çevrimiçi saat seçimi sunmuyor. Tercih ettiğin tarihi yaz; işletme sana saat önerir.') }}</p>
            <template v-else>
              <div class="days" role="group" :aria-label="i18nT('Gün seç')">
                <button v-for="d in weekDays" :key="d.date" type="button" class="day" :class="{on:chosenDate===d.date}" :aria-pressed="chosenDate===d.date" :disabled="!d.slots.length||loadingSlots" @click="chooseDate(d.date)"><span class="ds-xs">{{ d.week }}</span><strong>{{ d.day }}</strong></button>
              </div>
              <div class="ds-col ds-g8">
                <div class="ds-row ds-sb ds-wrap ds-g8"><strong class="ds-small">{{ i18nT('Uygun saatler') }}</strong><span v-if="availability?.slotMinutes" class="ds-xs ds-muted">{{ i18nT('{0} dakikalık aralıklar · Türkiye saati', {'0': availability.slotMinutes}) }}</span></div>
                <p v-if="loadingSlots" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
                <p v-else-if="!chosenDate" class="ds-small ds-muted">{{ i18nT('Önce uygun bir gün seç.') }}</p>
                <div v-else class="slots" role="group" :aria-label="i18nT('Saat seç')">
                  <button v-for="s in chosenSlots" :key="s" type="button" class="ds-chip slot" :class="{on:chosenSlot===s}" :aria-pressed="chosenSlot===s" @click="chosenSlot=chosenSlot===s?'':s">{{ s }}</button>
                </div>
              </div>
            </template>
          </template>
          <template v-else>
          <div class="ds-row ds-sb">
            <strong class="month">{{ monthLabel }}</strong>
            <div class="ds-row ds-g8">
              <button type="button" class="ds-iconbtn ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')" :aria-label="i18nT('Önceki hafta')"><ChevronLeft :size="18"/></button>
              <button type="button" class="ds-iconbtn ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')" :aria-label="i18nT('Sonraki hafta')"><ChevronRight :size="18"/></button>
            </div>
          </div>
          <div class="days">
            <button v-for="d in days" :key="d.key" type="button" class="day ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><span class="ds-xs">{{ d.week }}</span><strong>{{ d.day }}</strong></button>
          </div>
          <div class="ds-col ds-g8">
            <div class="ds-row ds-sb ds-wrap ds-g8"><strong class="ds-small">{{ i18nT('Uygun saatler') }}</strong><span class="ds-xs ds-muted">{{ i18nT('Saat bilgisi yok') }}</span></div>
            <div class="slots">
              <button v-for="s in slots" :key="s" type="button" class="ds-chip slot ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ s }}</button>
            </div>
          </div>
          </template>
          <label class="f"><span class="ds-label">{{ i18nT('Tercih ettiğin tarih') }}</span><input ref="dateInput" class="ds-field" name="preferredDate" type="date" required :min="today" @change="chosenDate=($event.target as HTMLInputElement).value;chosenSlot=''"/></label>
          <p v-if="liveSlots&&chosenSlot" class="ds-note info">{{ i18nT('Seçtiğin saat bir istektir: {0} {1}. İşletme kabul etmeden randevu kesinleşmez.', {'0': chosenDate, '1': chosenSlot}) }}</p>
        </template>
        <div class="grid2">
          <label class="f"><span class="ds-label">{{ i18nT('İstediğin hizmet') }}</span><input class="ds-field" name="service" required minlength="2" maxlength="120"/></label>
          <label class="f"><span class="ds-label">{{ i18nT('Aracın') }}</span><input class="ds-field" name="vehicle" required minlength="2" maxlength="120" :placeholder="i18nT('Marka, model ve yıl')"/></label>
        </div>
        <div class="ds-col">
          <label class="f"><span class="ds-label">{{ i18nT('Açıklama') }}</span><textarea class="ds-field message" name="message" minlength="10" maxlength="2000" required :placeholder="i18nT('İhtiyacını anlat. Plaka veya özel bilgi eklemene gerek yok.')"/></label>
          <p class="ds-help">{{ i18nT('Plaka ve telefon gibi kişisel bilgileri yazmana gerek yok.') }}</p>
        </div>
        <template v-if="kind==='quotes'">
          <div class="ds-col">
            <span class="ds-label">{{ i18nT('Fotoğraf (isteğe bağlı)') }}</span>
            <button type="button" class="tile ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Upload :size="20"/><span class="ds-xs">{{ i18nT('Ekle') }}</span></button>
          </div>
          <div class="grid2">
            <label class="f"><span class="ds-label">{{ i18nT('Tercih edilen zaman') }}</span><select class="ds-field ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><option>{{ i18nT('Bu hafta içinde') }}</option></select></label>
            <label class="f"><span class="ds-label">{{ i18nT('İletişim tercihi') }}</span><select class="ds-field ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><option>{{ i18nT('Uygulama mesajı') }}</option></select></label>
          </div>
        </template>
        <div v-else class="ds-note info"><Info :size="16" class="ds-i"/><span>{{ i18nT('İşletmenin kabulü olmadan randevu kesinleşmez. Bu adımda ödeme alınmaz.') }}</span></div>
        <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
        <div class="ds-row ds-sb ds-wrap ds-g12">
          <NuxtLink class="ds-btn s" :to="`/servis/${encodeURIComponent(business.id)}`">{{ i18nT('Geri') }}</NuxtLink>
          <button :disabled="busy" class="ds-btn p lg">{{ busy?i18nT('Gönderiliyor…'):kind==='appointments'?i18nT('Randevu talebi gönder'):i18nT('Talebi gönder') }}<ArrowRight v-if="!busy" :size="16"/></button>
        </div>
      </form>
      <aside class="ds-col ds-g16">
        <div class="ds-card biz">
          <div class="visual"><BusinessVisual :business="business"/></div>
          <div class="ds-col ds-g6 ds-pad">
            <div class="ds-row ds-g6 ds-wrap">
              <span v-if="business.ownership==='verified'" class="ds-badge ok"><BadgeCheck :size="12"/>{{ i18nT('Doğrulanmış') }}</span>
              <span v-if="business.sample" class="ds-badge neu">{{ i18nT('Örnek işletme') }}</span>
            </div>
            <h2 class="t19">{{ business.name }}</h2>
            <p class="ds-small ds-muted">{{ business.district }}, {{ business.city }}</p>
          </div>
        </div>
        <div class="ds-card ds-pad ds-col ds-g8">
          <h2 class="t16">{{ kind==='quotes'?i18nT('Seçimlerin'):i18nT('Özet') }}</h2>
          <div v-if="kind==='appointments'" class="ds-row ds-sb ds-g12"><span class="ds-small ds-muted">{{ i18nT('İşletme') }}</span><strong class="ds-small val">{{ business.name }}</strong></div>
          <div class="ds-row ds-sb ds-g12"><span class="ds-small ds-muted">{{ i18nT('Hizmet') }}</span><strong class="ds-small val">{{ picked.service||'—' }}</strong></div>
          <div class="ds-row ds-sb ds-g12"><span class="ds-small ds-muted">{{ i18nT('Araç') }}</span><strong class="ds-small val">{{ picked.vehicle||'—' }}</strong></div>
          <div v-if="kind==='appointments'" class="ds-row ds-sb ds-g12"><span class="ds-small ds-muted">{{ i18nT('Zaman') }}</span><strong class="ds-small val">{{ picked.preferredDate?new Date(picked.preferredDate+'T12:00:00').toLocaleDateString(localeTag):'—' }}</strong></div>
        </div>
        <div v-if="kind==='quotes'" class="ds-note"><Info :size="16" class="ds-i"/><span>{{ i18nT('İşletmenin kabulü olmadan randevu kesinleşmez. Bu adımda ödeme alınmaz.') }}</span></div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.req {max-width: 1440px; padding-top: 32px; padding-bottom: 64px;}
p, h1, h2 {margin: 0;}
.h28 {font-size: 28px; line-height: 31.36px;}
.t19, .t16 {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0;}
.t19 {font-size: 19px; line-height: 24.7px; overflow-wrap: anywhere;}
.t16 {font-size: 16px; line-height: 21.6px;}
.state {max-width: 640px; margin: 0 auto; padding: 32px; align-items: flex-start;}
.state .ds-note {align-items: stretch; width: 100%;}
.grid {display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start;}
.main {padding: 32px; min-width: 0;}
.steps {flex-wrap: wrap;}
.grid2 {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;}
.f {display: block; min-width: 0;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
textarea.message {height: 140px;}
.ds-label {display: block;}
.tile {display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 120px; height: 96px; padding: 0; background: #fff; border: 1px dashed #dfe5eb; border-radius: 14px; color: #10243a;}
.month {font-size: 15px; line-height: 22.5px;}
.days {display: flex; flex-wrap: wrap; gap: 10px;}
.day.on {border-color: #c4460b; background: #fff3ec; color: #a63c09;}
.day:disabled {opacity: .45; cursor: not-allowed;}
.slot.on {border-color: #c4460b; background: #fff3ec; color: #a63c09;}
.day {display: flex; flex-direction: column; align-items: center; width: 76px; padding: 10px 0; background: #fff; border: 1px solid #dfe5eb; border-radius: 12px; color: #10243a;}
.day strong {font-size: 20px; line-height: 30px;}
.slots {display: flex; flex-wrap: wrap; gap: 10px;}
.slot {justify-content: center; width: 96px; height: 42px; border: 0;}
.biz {overflow: hidden;}
.visual {height: 150px;}
.val {text-align: right; overflow-wrap: anywhere;}
@media (max-width: 1100px) {
  .grid {grid-template-columns: minmax(0, 1fr) 300px;}
}
@media (max-width: 760px) {
  .req {padding-top: 20px; padding-bottom: 32px;}
  .grid {grid-template-columns: minmax(0, 1fr);}
  .main, .state {padding: 20px;}
}
@media (max-width: 480px) {
  .grid2 {grid-template-columns: minmax(0, 1fr);}
  .steps .ds-step-line {display: none;}
  .day {width: calc((100% - 20px) / 3);}
  .slot {width: calc((100% - 20px) / 3);}
}
</style>
