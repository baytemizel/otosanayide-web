<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue';
import {ArrowRight, Bell, ChevronLeft, ChevronRight, Info} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Select from '~/components/v2/V2Select.vue';
import RequestBusinessHead from '~/components/v2/requests/RequestBusinessHead.vue';
import RequestSuccessCard from '~/components/v2/requests/RequestSuccessCard.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {memberToken, requestKeyKeeper, requestSendError, sendRequest, useAvailability, useMemberRequests, useRequestBusiness} from '~/composables/v2/useRequests';
import {
  DEFAULT_REQUEST_BUSINESS_ID, appointmentClosedWeekdays, appointmentDefault, appointmentFirstWeek, appointmentSlotTimes,
  appointmentTaken, appointmentWeekCount, formatTry, mockOfferById, mockRequests, offerTotal, requestBusiness, requestServices,
} from '~/data/mock/requests';
import {demoMode} from '~/lib/env';
import {
  addDays, calendarDays, dayLongText, formatMoney, istanbulToday, monthTitle as monthOf, otherVehicleText, requestDraftProblem, slotLabel, vehicleOptions,
} from '~/lib/v2/requests';

// W16 · Randevu · Zaman seçimi (Figma 126:951). Week strip + time grid.
// Demo: ?servis=<id> picks the mock business, ?teklif=<id> fills service, vehicle and amount; sending
// shows a mock success state. Live: the business and its open hours come from the API
// (GET /api/businesses/{id}/availability?v=2: free and full slots, 30-minute slots possible; a full
// slot is drawn as taken like in demo); sending is an appointment request (POST /api/requests,
// kind=appointments, preferredDate + preferredSlot, vehicleId for a garage vehicle) that the
// business still has to accept. ?talep=<id> (an accepted quote) fills service, vehicle and amount.
const app = useMemberPage();
const demo = demoMode();

useSeoMeta({title: 'Randevu al', robots: 'noindex, nofollow'});

const route = useRoute();
const router = useRouter();

/* ---------------------------------------------------------------- demo */
const mockBiz = computed(() => requestBusiness(String(route.query.servis ?? '')) ?? requestBusiness(DEFAULT_REQUEST_BUSINESS_ID)!);
const context = computed(() => {
  const byId = mockOfferById(String(route.query.teklif ?? ''));
  if (byId) return byId;
  for (const request of mockRequests) {
    const offer = request.offers.find((item) => item.businessId === mockBiz.value.id);
    if (offer) return {request, offer};
  }
  return undefined;
});

/* Calendar (dates are handled in UTC so server and client agree). */
const DAY = 86_400_000;
const firstMonday = Date.parse(`${appointmentFirstWeek}T00:00:00Z`);
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('tr-TR', {timeZone: 'UTC', ...options});

const weekIndex = ref(Math.max(0, Math.floor((Date.parse(`${appointmentDefault.date}T00:00:00Z`) - firstMonday) / (7 * DAY))));
const selectedDate = ref(demo ? appointmentDefault.date : '');
const selectedTime = ref<string | null>(demo ? appointmentDefault.time : null);
const submitted = ref(false);

interface Day { date: string; short: string; num: string; closed: boolean; free: number }
const mockDays = computed<Day[]>(() => Array.from({length: 6}, (_, offset) => {
  const date = iso(firstMonday + (weekIndex.value * 7 + offset) * DAY);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const closed = appointmentClosedWeekdays.includes(weekday);
  return {
    date,
    short: fmt(date, {weekday: 'short'}).replace('.', '').toLocaleUpperCase('tr-TR'),
    num: String(Number(date.slice(8, 10))),
    closed,
    free: closed ? 0 : appointmentSlotTimes.length - appointmentTaken(date).length,
  };
}));

/* ---------------------------------------------------------------- live */
const businessId = computed(() => String(route.query.servis ?? ''));
const liveBiz = useRequestBusiness(() => businessId.value, 'appointments');
const gate = computed(() => {
  if (demo) return '';
  if (liveBiz.state.value !== 'found') return liveBiz.state.value;
  return liveBiz.canRequest.value ? '' : 'closed';
});
const today = istanbulToday();
const LAST_DAY = addDays(today, 90);
const weekStart = ref(today);
const availability = useAvailability(() => businessId.value, weekStart, () => !gate.value);
const liveDays = computed(() => calendarDays(weekStart.value, availability.data.value?.days ?? [], 7).filter((day) => day.date <= LAST_DAY));
const noOnlineSlots = computed(() => availability.data.value?.slotMinutes === null);
watch(() => availability.data.value, (value) => {
  if (!value || selectedDate.value) return;
  const first = liveDays.value.find((day) => day.free > 0) ?? liveDays.value.find((day) => !day.closed);
  if (first) selectedDate.value = first.date;
});

const requests = useMemberRequests();
const liveContext = computed(() => {
  const id = String(route.query.talep ?? '');
  return id ? requests.views.value.find((item) => item.id === id && item.businessId === businessId.value) : undefined;
});
const form = reactive({service: '', vehicleId: '', otherBrand: '', otherModel: '', otherYear: '', message: ''});
watch(liveContext, (value) => {
  if (!value) return;
  form.service ||= value.service;
  form.message ||= `#${value.id} numaralı teklif için randevu istiyorum.`;
}, {immediate: true});
const vehicles = computed(() => vehicleOptions(app.data.vehicles));
const serviceChoices = computed(() => (liveBiz.services.value.length ? liveBiz.services.value : requestServices.map((item) => item.label)));
const vehicleText = computed(() => (liveContext.value?.vehicle
  ?? (form.vehicleId === 'diger' ? otherVehicleText(form.otherBrand, form.otherModel, form.otherYear) : vehicles.value.find((v) => v.id === form.vehicleId)?.text ?? '')));

/* ---------------------------------------------------------------- one view for the template */
const business = computed(() => (demo ? mockBiz.value : liveBiz.business.value));
const days = computed<Day[]>(() => (demo ? mockDays.value : liveDays.value));
const slotTimes = computed(() => (demo ? appointmentSlotTimes : liveDays.value.find((day) => day.date === selectedDate.value)?.slots ?? []));
const taken = computed(() => new Set(demo ? appointmentTaken(selectedDate.value) : liveDays.value.find((day) => day.date === selectedDate.value)?.taken ?? []));
const monthTitle = computed(() => {
  if (!demo) return monthOf(days.value[3]?.date ?? weekStart.value);
  const middle = days.value[2]!.date;
  const text = fmt(middle, {month: 'long', year: 'numeric'});
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
});
const dayLong = computed(() => (selectedDate.value ? dayLongText(selectedDate.value) : '—'));
const timeText = computed(() => (selectedTime.value ? (demo ? selectedTime.value : slotLabel(selectedTime.value)) : null));
const serviceLabel = computed(() => (demo ? context.value?.request.service ?? mockBiz.value.tags[0] ?? mockBiz.value.category : form.service || '—'));
const vehicleLabel = computed(() => (demo ? (context.value?.request.vehicle === 'Renault Clio' ? 'Renault Clio · 2021' : 'BMW 320i · 2019') : vehicleText.value || '—'));
const amount = computed(() => (demo
  ? context.value ? formatTry(offerTotal(context.value.offer)) : ''
  : liveContext.value?.amount ? formatMoney(liveContext.value.amount) : ''));
const canPrev = computed(() => (demo ? weekIndex.value > 0 : weekStart.value > today));
const canNext = computed(() => (demo ? weekIndex.value < appointmentWeekCount - 1 : addDays(weekStart.value, 7) <= LAST_DAY));

function pickDay(day: Day) {
  if (day.closed) return;
  selectedDate.value = day.date;
  if (selectedTime.value && (!slotTimes.value.includes(selectedTime.value) || taken.value.has(selectedTime.value))) selectedTime.value = null;
}
function moveWeek(delta: number) {
  if (demo) {
    weekIndex.value = Math.min(appointmentWeekCount - 1, Math.max(0, weekIndex.value + delta));
    return;
  }
  const next = addDays(weekStart.value, delta * 7);
  if (next < today || next > LAST_DAY) return;
  weekStart.value = next;
  selectedDate.value = '';
  selectedTime.value = null;
}
function back() {
  if (import.meta.client && window.history.length > 1) router.back();
  else void navigateTo('/taleplerim');
}

const token = memberToken();
const sending = ref(false);
const sendError = ref('');
const manualDate = ref('');
const requestKey = requestKeyKeeper();
/** v2-01: the garage vehicle's id (picked here, or the one the accepted quote was sent with). */
const vehicleId = computed(() => (liveContext.value ? liveContext.value.vehicleId ?? undefined : form.vehicleId && form.vehicleId !== 'diger' ? form.vehicleId : undefined));
const canSend = computed(() => (demo ? !!selectedTime.value : noOnlineSlots.value ? !!manualDate.value : !!selectedTime.value));
async function submit() {
  if (demo) {
    if (!selectedTime.value) return;
    submitted.value = true;
    if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }
  if (sending.value || !business.value) return;
  const draft = {
    businessId: business.value.id, kind: 'appointments' as const, service: form.service, vehicle: vehicleText.value, message: form.message.trim(),
    preferredDate: noOnlineSlots.value ? manualDate.value || undefined : selectedDate.value || undefined,
    preferredSlot: noOnlineSlots.value ? undefined : selectedTime.value ?? undefined,
    ...(vehicleId.value ? {vehicleId: vehicleId.value} : {}),
  };
  sendError.value = requestDraftProblem(draft) || (draft.preferredDate ? '' : 'Bir gün ve saat seç.');
  if (sendError.value) return;
  sending.value = true;
  try {
    await sendRequest(token, draft, requestKey.for(draft));
    requestKey.clear();
    if (noOnlineSlots.value) selectedDate.value = manualDate.value;
    submitted.value = true;
    if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
  } catch (error) {
    sendError.value = requestSendError(error, 'appointments');
    if (/uygun değil/.test(sendError.value)) {
      requestKey.clear();
      selectedTime.value = null;
      availability.refresh();
    }
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="randevu">
    <header class="head v2-wrap">
      <p class="t-mono-md t-eyebrow">RANDEVU</p>
      <h1 class="t-h2">{{ submitted ? 'Randevu talebin gönderildi' : 'Randevu zamanı seç' }}</h1>
    </header>

    <div v-if="gate || !business" class="body v2-wrap">
      <section class="main surface state" :aria-busy="gate === 'loading'">
        <p v-if="gate === 'loading'" class="t-body-md t-muted" role="status">İşletme bilgisi yükleniyor…</p>
        <template v-else-if="gate === 'unavailable'">
          <h2 class="t-h4">Randevu şu anda açılamıyor.</h2>
          <p class="t-body-md t-muted">İşletme bilgisi alınamadı. Bağlantını kontrol edip tekrar dene.</p>
          <V2Button variant="outline" @click="router.go(0)">Tekrar dene</V2Button>
        </template>
        <template v-else>
          <h2 class="t-h4">{{ gate === 'closed' && business ? `${business.name} çevrimiçi randevu talebi almıyor.` : 'Randevu istenecek işletme bulunamadı.' }}</h2>
          <p class="t-body-md t-muted">Randevu yalnızca bu hizmeti etkinleştiren doğrulanmış işletmelerde istenebilir. İşletmeyle talep yazışmasından ya da profilindeki iletişim bilgilerinden gün ayarlayabilirsin.</p>
          <div class="state-actions">
            <V2Button variant="outline" @click="back">Geri</V2Button>
            <V2Button v-if="business" :to="`/servis/${business.id}`" arrow>İşletme profili</V2Button>
          </div>
        </template>
      </section>
    </div>

    <div v-else class="body v2-wrap">
      <RequestSuccessCard
        v-if="submitted"
        class="main"
        eyebrow="ONAY BEKLENİYOR"
        :title="timeText ? `${dayLong} · ${timeText}` : dayLong"
        :text="demo
          ? `${business.name} talebini onayladığında randevun kesinleşir. Onaylanınca bildirim ve takvim daveti gelir.`
          : `${business.name} talebini onayladığında randevun kesinleşir. Onaylanınca uygulama içi bildirim alırsın; Taleplerim sayfasından takip edebilirsin.`"
      >
        <template #actions>
          <V2Button to="/taleplerim" size="lg" arrow>Taleplerime dön</V2Button>
          <V2Button v-if="demo" variant="outline" @click="submitted = false">Zamanı değiştir</V2Button>
        </template>
      </RequestSuccessCard>

      <form v-else class="main surface cal" @submit.prevent="submit">
        <div class="cal-head">
          <h2 class="t-h4" aria-live="polite">{{ monthTitle }}</h2>
          <span class="spacer"/>
          <button type="button" class="nav-btn" aria-label="Önceki hafta" :disabled="!canPrev || availability.loading.value" @click="moveWeek(-1)"><ChevronLeft :size="18" aria-hidden="true"/></button>
          <button type="button" class="nav-btn" aria-label="Sonraki hafta" :disabled="!canNext || availability.loading.value" @click="moveWeek(1)"><ChevronRight :size="18" aria-hidden="true"/></button>
        </div>

        <p v-if="!demo && availability.loading.value" class="t-body-sm t-muted" role="status">Uygun saatler yükleniyor…</p>
        <p v-if="!demo && availability.error.value" class="err t-body-sm" role="alert">{{ availability.error.value }} <button type="button" class="link" @click="availability.refresh()">Tekrar dene</button></p>
        <template v-if="!demo && noOnlineSlots">
          <p class="note"><Info :size="16" aria-hidden="true"/>Bu işletme çevrimiçi saat seçimi sunmuyor. Tercih ettiğin günü yaz; işletme sana saat önerir.</p>
          <label class="field date-field">
            <span class="field-label">Tercih ettiğin gün</span>
            <input v-model="manualDate" type="date" class="input" :min="today" :max="LAST_DAY">
          </label>
        </template>
        <template v-else>
        <div class="week" :class="{seven: !demo}" role="group" aria-label="Gün seç">
          <button
            v-for="day in days"
            :key="day.date"
            type="button"
            class="day"
            :class="{on: day.date === selectedDate, closed: day.closed}"
            :disabled="day.closed"
            :aria-pressed="day.date === selectedDate"
            :aria-label="`${fmt(day.date, {weekday: 'long', day: 'numeric', month: 'long'})}, ${day.closed ? (demo ? 'kapalı' : 'uygun saat yok') : `${day.free} uygun saat`}`"
            @click="pickDay(day)"
          >
            <span class="day-short">{{ day.short }}</span>
            <span class="day-num">{{ day.num }}</span>
            <span class="day-sub">{{ day.closed ? (demo ? 'Kapalı' : 'Uygun saat yok') : !day.free ? 'Dolu' : day.date === selectedDate ? `${day.free} saat` : 'Uygun' }}</span>
          </button>
        </div>

        <p id="slots-title" class="slots-title">{{ dayLong }} · Uygun saatler<span v-if="!demo && availability.data.value?.slotMinutes" class="t-body-sm t-muted"> · {{ availability.data.value.slotMinutes }} dakikalık aralıklar, Türkiye saati</span></p>
        <p v-if="!demo && !selectedDate && !availability.loading.value" class="t-body-sm t-muted">Önce uygun bir gün seç.</p>
        <div class="slots" role="group" aria-labelledby="slots-title">
          <button
            v-for="time in slotTimes"
            :key="time"
            type="button"
            class="slot"
            :class="{on: time === selectedTime, taken: taken.has(time)}"
            :disabled="taken.has(time)"
            :aria-pressed="time === selectedTime"
            :aria-label="taken.has(time) ? `${demo ? time : slotLabel(time)}, dolu` : demo ? time : slotLabel(time)"
            @click="selectedTime = time"
          >{{ demo ? time : slotLabel(time) }}</button>
        </div>

        <ul class="legend t-body-sm t-muted" aria-hidden="true">
          <li><span class="swatch on"/>Seçili</li>
          <li><span class="swatch free"/>Uygun</li>
          <li><span class="swatch taken"/>Dolu</li>
        </ul>
        </template>

        <div v-if="!demo" class="live-fields">
          <label class="field">
            <span class="field-label">Hizmet</span>
            <input v-if="liveContext" class="input" :value="form.service" readonly>
            <V2Select v-else v-model="form.service" :options="serviceChoices" placeholder="Hizmet seç" aria-label="Hizmet"/>
          </label>
          <label class="field">
            <span class="field-label">Araç</span>
            <input v-if="liveContext" class="input" :value="liveContext.vehicle" readonly>
            <V2Select v-else v-model="form.vehicleId" :options="[...vehicles.map((item) => ({value: item.id, label: item.label})), {value: 'diger', label: 'Başka bir araç'}]" placeholder="Araç seç" aria-label="Araç"/>
          </label>
          <div v-if="!liveContext && form.vehicleId === 'diger'" class="other">
            <label class="field"><span class="field-label">Marka</span><input v-model="form.otherBrand" class="input" placeholder="Örn. Toyota" autocomplete="off"></label>
            <label class="field"><span class="field-label">Model</span><input v-model="form.otherModel" class="input" placeholder="Örn. Corolla" autocomplete="off"></label>
            <label class="field"><span class="field-label">Yıl</span><input v-model="form.otherYear" class="input" inputmode="numeric" maxlength="4" placeholder="2020" autocomplete="off"></label>
          </div>
          <label class="field wide">
            <span class="field-label">Not (en az 10 karakter)</span>
            <textarea v-model="form.message" class="textarea" maxlength="2000" placeholder="Yaptırmak istediğin işi kısaca yaz. Plaka ve telefon yazman gerekmez."/>
          </label>
        </div>

        <p class="note"><Info :size="16" aria-hidden="true"/>{{ demo ? 'Bu işletme talep onaylı randevu kullanır: talebin, işletme onayladığında kesinleşir.' : 'Seçtiğin saat bir istektir: işletme kabul etmeden randevu kesinleşmez. Bu adımda ödeme alınmaz.' }}</p>
        <p v-if="sendError" class="err t-body-sm" role="alert">{{ sendError }}</p>

        <div class="actions">
          <V2Button variant="outline" @click="back">Geri</V2Button>
          <span class="spacer"/>
          <button type="submit" class="btn btn-primary btn-lg" :disabled="!canSend || sending">{{ sending ? 'Gönderiliyor…' : 'Randevu talebi gönder' }}<ArrowRight aria-hidden="true"/></button>
        </div>
      </form>

      <aside class="summary surface" aria-label="Randevu özeti">
        <h2 class="t-h4">Özet</h2>
        <RequestBusinessHead :business="business"/>
        <hr class="divider">
        <div class="row"><span class="t-body-sm t-muted">Hizmet</span><span class="t-label-sm">{{ serviceLabel }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Araç</span><span class="t-label-sm">{{ vehicleLabel }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Tarih</span><span class="t-label-sm">{{ dayLong }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Saat</span><span class="t-label-sm">{{ timeText ?? '—' }}</span></div>
        <hr class="divider">
        <div v-if="amount" class="row"><span class="t-body-sm t-muted">Tahmini tutar</span><strong class="amount">{{ amount }}</strong></div>
        <div v-else class="row"><span class="t-body-sm t-muted">Tahmini tutar</span><span class="t-label-sm">Ön incelemede netleşir</span></div>
        <p class="bell-note"><Bell :size="16" aria-hidden="true"/>{{ demo ? 'Onaylanınca bildirim ve takvim daveti gelir.' : 'Onaylanınca uygulama içi bildirim alırsın.' }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.head{display:flex;flex-direction:column;gap:12px;padding-top:48px}
.body{display:flex;align-items:flex-start;gap:32px;padding-top:36px;padding-bottom:104px}
.main{flex:1 1 0;min-width:0}
.cal{display:flex;flex-direction:column;gap:24px;padding:32px}
.cal-head{display:flex;align-items:center;gap:10px}
.spacer{flex:1}
.nav-btn{width:40px;height:40px;border-radius:999px;background:var(--cream-100);color:var(--ink-800);display:grid;place-items:center}
.nav-btn:disabled{opacity:.4;cursor:default}

.week{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.day{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 4px;background:var(--white);border:1px solid var(--cream-200);border-radius:20px;color:var(--ink-900);transition:border-color .15s ease,transform .15s ease}
.day:hover:not(:disabled){border-color:var(--ink-300);transform:translateY(-1px)}
.day-short{font-family:var(--font-mono);font-weight:500;font-size:11px;line-height:1.3;letter-spacing:.06em;color:var(--ink-500)}
.day-num{font-family:var(--font-display);font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-.01em}
.day-sub{font-size:12px;line-height:1.45;color:var(--ink-500)}
.day.on{background:var(--ink-900);border-color:var(--ink-900);color:var(--white)}
.day.on .day-short{color:var(--lime-400)}
.day.on .day-sub{color:var(--white)}
.day.closed{background:var(--cream-50);cursor:not-allowed}
.day.closed .day-num{color:var(--ink-300)}

.slots-title{font-weight:600;font-size:17px;line-height:1.2;color:var(--ink-900)}
.slots{display:flex;flex-wrap:wrap;gap:12px}
.slot{width:112px;height:50px;border-radius:16px;background:var(--white);border:1px solid var(--cream-200);font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-900);transition:border-color .15s ease}
.slot:hover:not(:disabled){border-color:var(--ink-900)}
.slot.taken{background:var(--cream-100);border-color:var(--cream-100);color:var(--ink-300);cursor:not-allowed}
.slot.on{background:var(--orange-500);border-color:var(--orange-500)}

.legend{display:flex;gap:18px;font-size:13px}
.legend li{display:flex;align-items:center;gap:6px}
.swatch{width:12px;height:12px;border-radius:999px}
.swatch.on{background:var(--orange-500)}
.swatch.free{background:var(--white);border:1px solid var(--cream-200)}
.swatch.taken{background:var(--cream-100)}

.note{display:flex;align-items:flex-start;gap:10px;padding:14px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;font-size:13px;line-height:1.45;color:var(--ink-700)}
.note svg{flex:none;color:var(--ink-500);margin-top:1px}
.actions{display:flex;align-items:center}
.week.seven{grid-template-columns:repeat(7,minmax(0,1fr))}
.state{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:32px}
.state-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.live-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.live-fields .wide,.live-fields .other{grid-column:1 / -1}
.other{display:grid;grid-template-columns:1fr 1fr 140px;gap:12px}
.date-field{max-width:320px}
.err{color:var(--red-500);font-weight:600}
.link{color:var(--orange-600);font-weight:600;text-decoration:underline}

.summary{width:380px;flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px}
.summary .divider{width:100%}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}
.row .t-label-sm{text-align:right;color:var(--ink-900)}
.amount{font-weight:700;font-size:20px;line-height:1.2;color:var(--ink-900)}
.bell-note{display:flex;align-items:flex-start;gap:10px;width:100%;padding:14px;background:var(--lime-100);border-radius:18px;font-size:13px;line-height:1.45;color:var(--ink-800)}
.bell-note svg{flex:none;margin-top:1px}

@media (max-width:1100px){
  .body{flex-direction:column;align-items:stretch}
  .summary{width:100%}
}
@media (max-width:760px){
  .head{padding-top:32px}
  .body{padding-top:24px;padding-bottom:64px;gap:20px}
  .cal{padding:20px;gap:20px}
  .week,.week.seven{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .live-fields{grid-template-columns:1fr}
  .other{grid-template-columns:1fr 1fr}
  .slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .slot{width:auto}
  .legend{flex-wrap:wrap}
  .actions .btn-lg{padding:16px 20px;font-size:15px}
}
</style>
